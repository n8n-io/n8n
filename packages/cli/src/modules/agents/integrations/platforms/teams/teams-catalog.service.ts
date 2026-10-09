import type { AgentTeamsIntegrationSettings, TeamsCatalogState } from '@n8n/api-types';
import type { CredentialsEntity, User } from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { sleep } from '@n8n/utils/sleep';
import { OperationalError, UserError } from 'n8n-workflow';

import { CredentialsFinderService } from '@n8n/backend-services';
import { BadRequestError } from '@n8n/errors';

import { CredentialsService } from '@/credentials/credentials.service';

import { BOT_CREDENTIAL_TYPE } from './teams-entra-provisioning.service';
import { graphErrorCode, graphErrorMessage, TeamsGraphService } from './teams-graph.service';
import { TeamsManifestService } from './teams-manifest.service';
import { TEAMS_MANAGER_CREDENTIAL_TYPE } from './teams-managed-setup.service';
import { GRAPH_RESOURCE, TeamsManagerTokenService } from './teams-manager-token.service';
import { TeamsSetupService } from './teams-setup.service';
import { stringProperty } from '../../integration-helpers';

/**
 * How long the recorded publish answers for the catalogue. Microsoft takes up
 * to a day or two to list a published app, and the note exists only to cover
 * that. The far end of the range: expiring early offers a publish that already
 * happened, which Microsoft then refuses as a duplicate.
 */
const PUBLISH_NOTE_TTL_MS = 48 * 60 * 60 * 1000;

export interface TeamsCatalogScope {
	user: User;
	projectId: string;
	agentId: string;
	managerCredentialId: string;
	/** The channel's own credential, which carries what the last publish made. */
	credentialId?: string;
	/** Skips the listing, which answers empty straight after a publish. */
	teamsAppId?: string;
}

/**
 * Covers the seconds the listing index usually lags a write by, and no more.
 * Microsoft documents up to a day for an availability change to apply, which
 * no retry can sit through -- past this the step says to come back later.
 */
const CATALOG_LOOKUP_ATTEMPTS = 3;
const CATALOG_LOOKUP_DELAY_MS = 2000;

interface CatalogEntry {
	teamsAppId: string;
	publishingState: string | null;
}

export interface PublishTeamsAppOptions extends TeamsCatalogScope {
	credentialId: string;
	settings?: AgentTeamsIntegrationSettings;
}

/**
 * Publishes the generated app package to the organisation's Teams catalog.
 *
 * Publishing directly needs the Teams administrator role. Everyone else may
 * only submit for review, and Microsoft decides which of the two applies — so
 * the capability is read from what the publish call answers rather than from
 * asking the user what role they hold.
 */
@Service()
export class TeamsCatalogService {
	constructor(
		private readonly graph: TeamsGraphService,
		private readonly tokens: TeamsManagerTokenService,
		private readonly setupService: TeamsSetupService,
		private readonly manifestService: TeamsManifestService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsService: CredentialsService,
		private readonly logger: Logger,
	) {}

	async publish(options: PublishTeamsAppOptions): Promise<TeamsCatalogState> {
		const state = await this.publishToCatalog(options);
		await this.rememberPublish(options, state);
		return state;
	}

	private async publishToCatalog(options: PublishTeamsAppOptions): Promise<TeamsCatalogState> {
		const token = await this.graphToken(options);
		const archive = await this.setupService.buildPackage(
			options.user,
			{ projectId: options.projectId, agentId: options.agentId },
			options.credentialId,
			options.settings,
		);

		const existing = await this.findCatalogApp(token, options.agentId);
		if (existing) {
			const status = await this.updateExistingApp(token, existing.teamsAppId, archive);
			return { status, teamsAppId: existing.teamsAppId };
		}

		// A Teams administrator may publish outright. Anyone else is refused, and
		// the same package goes in for review instead. That refusal is the only
		// reliable way to tell the two apart.
		const direct = await this.graph.postZip(token, '/appCatalogs/teamsApps', archive);
		if (direct.ok) {
			this.logger.debug('[TeamsCatalog] Published straight to the organisation', {
				agentId: options.agentId,
				teamsAppId: stringProperty(direct.body, 'id') ?? null,
				externalId: this.manifestService.buildManifestId(options.agentId),
			});
			return this.createdState(direct.body, 'published');
		}

		if (direct.statusCode === 409 || graphErrorCode(direct.body) === 'Conflict') {
			return await this.publishOverConflict(token, options.agentId, archive, direct.body);
		}

		if (!this.isPermissionRefusal(direct.statusCode, graphErrorCode(direct.body))) {
			throw this.publishError(direct.statusCode, direct.body);
		}

		const submitted = await this.graph.postZip(
			token,
			'/appCatalogs/teamsApps?requiresReview=true',
			archive,
		);
		if (submitted.ok) {
			// A submitted app is not in the catalogue until somebody approves it,
			// which is why nothing can be installed from it yet.
			this.logger.debug('[TeamsCatalog] Sent for review instead of published', {
				agentId: options.agentId,
				teamsAppId: stringProperty(submitted.body, 'id') ?? null,
				refusedWith: direct.statusCode,
			});
			return this.createdState(submitted.body, 'submitted');
		}

		if (submitted.statusCode === 409 || graphErrorCode(submitted.body) === 'Conflict') {
			return await this.publishOverConflict(token, options.agentId, archive, submitted.body);
		}
		throw this.publishError(submitted.statusCode, submitted.body);
	}

	/**
	 * The listing is filtered on a value Microsoft indexes after the write, so a
	 * read taken straight after a create can come back empty. The created app
	 * answers for itself instead -- reporting "not listed yet" for an app we
	 * just made is what sends someone round to publish a second one.
	 */
	private createdState(body: unknown, status: 'published' | 'submitted'): TeamsCatalogState {
		const teamsAppId = stringProperty(body, 'id');
		return teamsAppId ? { status, teamsAppId } : { status: 'unknown', teamsAppId: null };
	}

	/**
	 * The name is taken, which means a publish already landed -- here or on an
	 * earlier run whose result never came back. Updating that app is what the
	 * caller asked for, so the second attempt finishes the job instead of
	 * reporting a clash they cannot act on.
	 */
	private async publishOverConflict(
		token: string,
		agentId: string,
		archive: Buffer,
		refusal: unknown,
	): Promise<TeamsCatalogState> {
		// Microsoft names the app it clashed with, and names it by the id from
		// our own manifest when the app is one of ours. That is a surer answer
		// than the listing, which has not caught up -- it is the reason the
		// caller published a second time. A message that does not name ours
		// proves nothing, though: the wording is Microsoft's to change.
		const externalId = this.manifestService.buildManifestId(agentId);
		const ours = (graphErrorMessage(refusal) ?? '').includes(externalId);

		const existing = await this.awaitCatalogApp(token, agentId);
		if (!existing) {
			throw ours
				? new UserError(
						'This agent already has an app in the organisation catalogue, and Microsoft has not listed it yet, so it cannot be updated. Nothing is wrong and nothing was lost — try again in a few minutes.',
					)
				: new UserError(
						'An app with this name is already in the organisation catalogue, and Microsoft has not listed it yet, so it cannot be updated. If an earlier publish made it, try again in a few minutes. If another app holds the name, rename the agent and try again.',
					);
		}
		const status = await this.updateExistingApp(token, existing.teamsAppId, archive);
		return { status, teamsAppId: existing.teamsAppId };
	}

	/**
	 * Reads the review back from Microsoft rather than tracking it here. An
	 * n8n-side copy would be a second queue that can disagree with the real one.
	 */
	async getState(options: TeamsCatalogScope): Promise<TeamsCatalogState> {
		const token = await this.graphToken(options);
		const state = await this.readState(token, options.agentId);
		if (state.status !== 'unknown') return state;

		// The listing does not return an app for some minutes after a publish,
		// and Microsoft allows itself a day. Asked in that window, it answers the
		// same way it answers about an app that was never published -- so a setup
		// reopened in it offered to publish again, and Microsoft refused the
		// second publish as a duplicate.
		return (await this.rememberedPublish(options)) ?? state;
	}

	/**
	 * Records what the publish made, beside the app registration the channel
	 * credential already carries. It is the only account of the publish that
	 * outlives the dialog: Microsoft has no route that reads one app back.
	 */
	private async rememberPublish(
		options: PublishTeamsAppOptions,
		state: TeamsCatalogState,
	): Promise<void> {
		if (!state.teamsAppId || state.status === 'unknown') return;
		try {
			const credential = await this.botCredential(options, 'credential:update');
			if (!credential) return;

			const current = (await this.credentialsService.decrypt(credential, true)) as Record<
				string,
				unknown
			>;
			// Rewritten even when it says the same thing: the timestamp is what
			// bounds it, so a re-publish has to push the window out.

			const updated = {
				...current,
				publishedTeamsAppId: state.teamsAppId,
				publishedTeamsAppState: state.status,
				publishedTeamsAppAt: new Date().toISOString(),
			};
			const encrypted = await this.credentialsService.createEncryptedData({
				id: credential.id,
				name: credential.name,
				type: credential.type,
				data: updated,
			});
			await this.credentialsService.update(
				credential.id,
				encrypted,
				{ kind: 'user', user: options.user },
				updated,
			);
		} catch (error) {
			// Microsoft has the app either way. Losing the note costs the user a
			// stale step, which is not worth undoing a publish that worked.
			this.logger.warn('[TeamsCatalog] Could not record the publish', {
				agentId: options.agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/** What the last publish made, for when the catalogue will not say. */
	private async rememberedPublish(
		options: TeamsCatalogScope,
	): Promise<TeamsCatalogState | undefined> {
		const credential = await this.botCredential(options, 'credential:read');
		if (!credential) return undefined;

		const data = await this.credentialsService.decrypt(credential, true);
		const teamsAppId = stringProperty(data, 'publishedTeamsAppId');
		const status = stringProperty(data, 'publishedTeamsAppState');
		if (!teamsAppId || (status !== 'published' && status !== 'submitted')) return undefined;

		// The note stands in for a listing that has not caught up, so it is only
		// worth what that lag costs. Past the window the catalogue is the better
		// answer: an administrator may have removed the app, and a note that
		// never expires would report it published for good. A note written
		// before the window existed carries no timestamp, and reading it as
		// expired puts those credentials back on the catalogue's own answer.
		const writtenAt = Date.parse(stringProperty(data, 'publishedTeamsAppAt') ?? '');
		if (Number.isNaN(writtenAt) || Date.now() - writtenAt > PUBLISH_NOTE_TTL_MS) {
			return undefined;
		}
		return { status, teamsAppId };
	}

	private async botCredential(
		options: TeamsCatalogScope,
		scope: 'credential:read' | 'credential:update',
	): Promise<CredentialsEntity | undefined> {
		if (!options.credentialId) return undefined;
		const credential = await this.credentialsFinderService.findCredentialForUser(
			options.credentialId,
			options.user,
			[scope],
		);
		return credential?.type === BOT_CREDENTIAL_TYPE ? credential : undefined;
	}

	/**
	 * The same two-step the first publish takes: an administrator updates the
	 * catalogue entry outright, and anyone else has to ask for a review. Without
	 * the retry a member could publish an app once and never update it again.
	 *
	 * It answers which route the update took, because the listing cannot: an
	 * update sent for review leaves the previously approved definition in place,
	 * so it still reads `published` while the change waits for somebody.
	 */
	private async updateExistingApp(
		token: string,
		teamsAppId: string,
		archive: Buffer,
	): Promise<'published' | 'submitted'> {
		const path = `/appCatalogs/teamsApps/${teamsAppId}/appDefinitions`;
		const direct = await this.graph.postZip(token, path, archive);
		if (direct.ok) return 'published';

		if (!this.isPermissionRefusal(direct.statusCode, graphErrorCode(direct.body))) {
			throw this.publishError(direct.statusCode, direct.body);
		}

		const submitted = await this.graph.postZip(token, `${path}?requiresReview=true`, archive);
		if (!submitted.ok) {
			throw this.publishError(submitted.statusCode, submitted.body);
		}
		return 'submitted';
	}

	/**
	 * Graph serves catalogue entries only as a filtered collection -- there is no
	 * read of a single app by key -- and the index behind that filter is written
	 * after the app is. So the entry a publish just made is missing for a short
	 * while, and the only honest answer is to ask again.
	 */
	private async awaitCatalogApp(token: string, agentId: string): Promise<CatalogEntry | undefined> {
		for (let attempt = 0; attempt < CATALOG_LOOKUP_ATTEMPTS; attempt++) {
			if (attempt > 0) await sleep(CATALOG_LOOKUP_DELAY_MS);

			const byExternalId = await this.queryCatalog(
				token,
				`externalId eq '${this.manifestService.buildManifestId(agentId)}'`,
			);
			if (byExternalId) return byExternalId;

			this.logger.debug('[TeamsCatalog] Catalogue has not listed the app yet', {
				agentId,
				attempt: attempt + 1,
				of: CATALOG_LOOKUP_ATTEMPTS,
			});
		}
		return undefined;
	}

	private async queryCatalog(token: string, filter: string): Promise<CatalogEntry | undefined> {
		const query = new URLSearchParams({ $filter: filter, $expand: 'appDefinitions' });
		const response = await this.graph.request(
			token,
			'GET',
			`/appCatalogs/teamsApps?${query.toString()}`,
		);
		// A refusal and an empty catalogue both answer `undefined`, and the caller
		// tells the user the app is not listed yet. Logged so a missing
		// `AppCatalog` consent does not read as Microsoft still catching up.
		if (!response.ok) {
			this.logger.debug('[TeamsCatalog] Could not read the catalogue', {
				statusCode: response.statusCode,
				error: graphErrorCode(response.body),
			});
			return undefined;
		}
		const value = isRecord(response.body) ? response.body.value : undefined;
		return this.toCatalogEntry(Array.isArray(value) ? value[0] : undefined);
	}

	/**
	 * The app is found by the id in our own manifest, which is derived from the
	 * agent id, so nothing has to be stored to find it again.
	 */
	private async findCatalogApp(token: string, agentId: string): Promise<CatalogEntry | undefined> {
		return await this.queryCatalog(
			token,
			`externalId eq '${this.manifestService.buildManifestId(agentId)}'`,
		);
	}

	private toCatalogEntry(entry: unknown): CatalogEntry | undefined {
		const teamsAppId = stringProperty(entry, 'id');
		if (!teamsAppId) return undefined;

		const definitions = isRecord(entry) ? entry.appDefinitions : undefined;
		const latest = Array.isArray(definitions) ? definitions[definitions.length - 1] : undefined;
		return {
			teamsAppId,
			publishingState: stringProperty(latest, 'publishingState') ?? null,
		};
	}

	private async readState(token: string, agentId: string): Promise<TeamsCatalogState> {
		const app = await this.findCatalogApp(token, agentId);
		if (!app) {
			// Policies take a day or two to apply, so an app that is not listed yet
			// is unknown rather than rejected. Treating absent as terminal would
			// tell a user their app was refused when it is merely not visible.
			return { status: 'unknown', teamsAppId: null };
		}

		switch (app.publishingState) {
			case 'published':
				return { status: 'published', teamsAppId: app.teamsAppId };
			case 'submitted':
				return { status: 'submitted', teamsAppId: app.teamsAppId };
			case 'rejected':
				return { status: 'rejected', teamsAppId: app.teamsAppId };
			default:
				return { status: 'unknown', teamsAppId: app.teamsAppId };
		}
	}

	/** A user without the Teams administrator role is refused this way. */
	private isPermissionRefusal(statusCode: number, code: string | undefined): boolean {
		return statusCode === 403 || code === 'Forbidden' || code === 'UnauthorizedAccessException';
	}

	/**
	 * Deliberately vague to the user. Microsoft's own wording for a rejected
	 * package runs to internal request ids and backend host names — unreadable,
	 * and nothing a user can act on. The full text goes to the log instead, where
	 * whoever can act on it will look.
	 */
	private publishError(statusCode: number, body: unknown): Error {
		if (statusCode === 409 || graphErrorCode(body) === 'Conflict') {
			return new UserError('An app with this name is already in the organisation catalogue.');
		}
		// Waiting changes nothing about a role the account does not hold, and this
		// is the answer when even the review route is closed to it.
		if (this.isPermissionRefusal(statusCode, graphErrorCode(body))) {
			return new UserError(
				'This account may not put the app in the organisation catalogue. A Teams administrator has to publish it.',
			);
		}
		return new OperationalError(
			'Microsoft would not accept the Teams app. Try again in a few minutes.',
		);
	}

	private async graphToken(options: TeamsCatalogScope): Promise<string> {
		const credential = await this.managerCredential(options);
		return await this.tokens.acquire(credential, GRAPH_RESOURCE);
	}

	private async managerCredential(options: TeamsCatalogScope): Promise<CredentialsEntity> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			options.managerCredentialId,
			options.user,
			['credential:read'],
		);
		if (!credential || credential.type !== TEAMS_MANAGER_CREDENTIAL_TYPE) {
			throw new BadRequestError('Sign in with Microsoft before publishing the Teams app.');
		}
		return credential;
	}
}
