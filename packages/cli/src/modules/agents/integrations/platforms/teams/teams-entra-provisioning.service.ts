import type { TeamsProvisionedAppSummary } from '@n8n/api-types';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { OperationalError, UserError } from 'n8n-workflow';
import { withTeamsFailure } from './teams-setup-telemetry.service';

import { CredentialsFinderService } from '@n8n/backend-services';
import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@n8n/errors';

import { graphErrorCode, TeamsGraphService } from './teams-graph.service';
import { TEAMS_MANAGER_CREDENTIAL_TYPE } from './teams-managed-setup.service';
import { GRAPH_RESOURCE, TeamsManagerTokenService } from './teams-manager-token.service';
import { sanitiseAppName, stringProperty } from '../../integration-helpers';

export const BOT_CREDENTIAL_TYPE = 'microsoftEntraServicePrincipalApi';

/** Replaced before it lapses, so a channel does not stop signing mid-life. */
const SECRET_RENEW_BEFORE_MS = 7 * 24 * 60 * 60 * 1000;

/** The secret a previous run stored, when it has enough life left to keep. */
function usableSecret(
	data: Record<string, unknown>,
): { value: string; expiresAt: string } | undefined {
	const value = stringProperty(data, 'clientSecret');
	const expiresAt = stringProperty(data, 'secretExpiresAt');
	if (!value || !expiresAt) return undefined;

	const expiry = Date.parse(expiresAt);
	if (Number.isNaN(expiry) || expiry - Date.now() < SECRET_RENEW_BEFORE_MS) return undefined;
	return { value, expiresAt };
}
const ENTRA_APP_URL =
	'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId';

/**
 * Tenants cap how long a client secret may live, and the cap varies. Ask for
 * the longest first and step down, so a tenant with a strict policy still gets
 * a secret rather than an error.
 */
const SECRET_LIFETIMES_MONTHS = [24, 12, 6, 3] as const;

/**
 * Prefix for the client-chosen alternate key the app is found by. No whitespace:
 * Entra rejects a tag containing any, and the same string is used for both.
 */
const UNIQUE_NAME_PREFIX = 'n8n-agent-';

/** OData closes a string literal on a quote, and escapes one by doubling it. */
const odataLiteral = (value: string) => value.replace(/'/g, "''");

/** Entra refuses a display name longer than this. */
const APP_NAME_MAX = 120;

export interface ProvisionEntraAppOptions {
	user: User;
	projectId: string;
	agentId: string;
	agentName: string;
	managerCredentialId: string;
}

interface CreatedApp {
	objectId: string;
	appId: string;
	displayName: string;
}

@Service()
export class TeamsEntraProvisioningService {
	constructor(
		private readonly graph: TeamsGraphService,
		private readonly tokens: TeamsManagerTokenService,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	/**
	 * Registers the customer's own Entra app and writes the channel credential
	 * from the values it just created, so the user never handles a secret.
	 *
	 * Running twice reuses the app registered the first time and only mints a
	 * fresh secret, rather than leaving a second registration behind.
	 */
	async provision(options: ProvisionEntraAppOptions): Promise<TeamsProvisionedAppSummary> {
		const manager = await this.managerCredential(options);
		const token = await this.tokens.acquire(manager, GRAPH_RESOURCE);
		const tenant = await this.readTenant(token);
		await this.rememberTenant(options.user, manager, tenant);

		const existing = await this.findProvisionedCredential(options);
		// The credential is a shortcut, not the record. Without it the upsert still
		// finds the app this agent already owns, and an app deleted in the tenant
		// falls back to making one rather than leaving the agent stuck on a
		// credential pointing at something that is gone.
		const found = existing ? await this.readApp(token, existing.objectId) : undefined;
		const app = found ?? (await this.createApp(token, options.agentId, options.agentName));

		// Only when there is not already one to use: every mint is a write in the
		// customer's directory, and Entra caps how many an app may hold. A
		// credential whose app has gone carries a secret for an app that no
		// longer exists, so the replacement needs one of its own.
		const secret =
			(found ? existing?.secret : undefined) ?? (await this.addSecret(token, app.objectId));
		// Harmless when one is already there, and an app picked up from an earlier
		// run may have lost its principal.
		await this.createServicePrincipal(token, app.appId);

		const credentialId = await this.writeBotCredential({
			options,
			app,
			secret,
			tenantId: tenant.tenantId,
			existingCredential: existing?.credential,
		});

		return {
			credentialId,
			appId: app.appId,
			appName: app.displayName,
			organizationName: tenant.organizationName,
			entraAppUrl: `${ENTRA_APP_URL}/${app.appId}`,
			secretExpiresAt: secret.expiresAt,
		};
	}

	private async managerCredential(options: ProvisionEntraAppOptions): Promise<CredentialsEntity> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			options.managerCredentialId,
			options.user,
			['credential:read'],
		);
		if (!credential || credential.type !== TEAMS_MANAGER_CREDENTIAL_TYPE) {
			throw withTeamsFailure(
				new BadRequestError('Sign in with Microsoft before creating the Teams app.'),
				'not_signed_in',
			);
		}
		return credential;
	}

	/**
	 * The directory behind the sign-in: the tenant ID the channel credential
	 * needs, and the organisation name the setup shows back.
	 */
	private async readTenant(
		token: string,
	): Promise<{ tenantId: string; organizationName: string | null }> {
		const organization = await this.graph.request(
			token,
			'GET',
			'/organization?$select=id,displayName',
		);
		// Graph hands the status back rather than throwing, so a refusal would
		// otherwise read as an empty directory and be blamed on the account type.
		if (!organization.ok) {
			throw new OperationalError('Could not read the organisation this account belongs to.');
		}
		const first = isRecord(organization.body)
			? (organization.body.value as unknown[] | undefined)?.[0]
			: undefined;
		const tenantId = stringProperty(first, 'id');
		if (!tenantId) {
			// A personal Microsoft account has no directory behind it.
			throw withTeamsFailure(
				new UserError('Sign in with a work or school account. A personal account cannot be used.'),
				'personal_account',
			);
		}

		return { tenantId, organizationName: stringProperty(first, 'displayName') ?? null };
	}

	/** Lets the setup show which organisation the sign-in belongs to. */
	private async rememberTenant(
		user: User,
		manager: CredentialsEntity,
		tenant: { tenantId: string; organizationName: string | null },
	): Promise<void> {
		const rawData = await this.credentialsService.decrypt(manager, true);
		const current = rawData as Record<string, unknown>;
		if (
			current.tenantId === tenant.tenantId &&
			current.organizationName === (tenant.organizationName ?? '')
		) {
			return;
		}

		const updated = {
			...rawData,
			tenantId: tenant.tenantId,
			organizationName: tenant.organizationName ?? '',
		};
		const encrypted = await this.credentialsService.createEncryptedData({
			id: manager.id,
			name: manager.name,
			type: manager.type,
			data: updated,
		});
		await this.credentialsService.update(manager.id, encrypted, { kind: 'user', user }, updated);
	}

	/**
	 * Creates the app, or picks up the one an earlier run created for this agent.
	 *
	 * `uniqueName` is a client-chosen alternate key, and the upsert keyed on it is
	 * one atomic call: Microsoft either makes the app or hands back the existing
	 * one. Searching first and creating second would leave a window in which two
	 * runs both decide to create, and losing the n8n credential would strand the
	 * old registration in the customer's directory.
	 */
	private async createApp(token: string, agentId: string, agentName: string): Promise<CreatedApp> {
		const displayName = sanitiseAppName(
			`${agentName || 'n8n Agent'} (n8n)`,
			APP_NAME_MAX,
			'n8n Agent (n8n)',
		);
		const uniqueName = `${UNIQUE_NAME_PREFIX}${agentId}`;

		const response = await this.graph.request(
			token,
			'PATCH',
			`/applications(uniqueName='${encodeURIComponent(odataLiteral(uniqueName))}')`,
			{
				displayName,
				// Microsoft no longer accepts new multi-tenant bots, and the app backs
				// one, so the registration is single tenant to match.
				signInAudience: 'AzureADMyOrg',
				// Not how the app is found — that is `uniqueName` — but it is what
				// someone sees in the Entra portal when they ask what made this.
				tags: [uniqueName],
			},
			{ Prefer: 'create-if-missing' },
		);

		if (!response.ok) {
			throw this.registrationError(response.statusCode, graphErrorCode(response.body));
		}

		// A create answers 201 with the app; an update answers 204 with nothing, so
		// the identifiers have to be read back.
		const objectId = stringProperty(response.body, 'id');
		const appId = stringProperty(response.body, 'appId');
		if (objectId && appId) return { objectId, appId, displayName };

		return await this.findAppByUniqueName(token, uniqueName, displayName);
	}

	private async findAppByUniqueName(
		token: string,
		uniqueName: string,
		displayName: string,
	): Promise<CreatedApp> {
		const query = new URLSearchParams({
			$filter: `uniqueName eq '${odataLiteral(uniqueName)}'`,
			$select: 'id,appId,displayName',
		});
		const response = await this.graph.request(token, 'GET', `/applications?${query.toString()}`);

		if (!response.ok) {
			// Otherwise a refusal reads as Microsoft having made the app and then
			// declined to name it, which is a different problem entirely.
			throw this.registrationError(response.statusCode, graphErrorCode(response.body));
		}

		const value = isRecord(response.body) ? response.body.value : undefined;
		const first = Array.isArray(value) ? value[0] : undefined;
		const objectId = stringProperty(first, 'id');
		const appId = stringProperty(first, 'appId');
		if (!objectId || !appId) {
			throw new OperationalError('Microsoft updated the app but would not say which one.');
		}
		return { objectId, appId, displayName: stringProperty(first, 'displayName') ?? displayName };
	}

	/** `undefined` when the app is gone from the tenant, so the caller remakes it. */
	private async readApp(token: string, objectId: string): Promise<CreatedApp | undefined> {
		const response = await this.graph.request(token, 'GET', `/applications/${objectId}`);
		if (response.statusCode === 404) return undefined;
		if (!response.ok) {
			throw new OperationalError('Could not read the app registration n8n created earlier.');
		}
		const appId = stringProperty(response.body, 'appId');
		if (!appId) throw new OperationalError('Microsoft returned an app with no identifier.');
		return {
			objectId,
			appId,
			displayName: stringProperty(response.body, 'displayName') ?? 'n8n Agent',
		};
	}

	/**
	 * Removes only secrets whose own expiry has passed. A live one may belong to
	 * another instance running the same agent, and Entra caps how many an app
	 * may hold -- so the dead ones are cleared and nothing else is touched.
	 */
	private async dropExpiredSecrets(token: string, objectId: string): Promise<void> {
		const response = await this.graph.request(token, 'GET', `/applications/${objectId}`);
		if (!response.ok) return;

		const credentials = isRecord(response.body) ? response.body.passwordCredentials : undefined;
		if (!Array.isArray(credentials)) return;

		const now = Date.now();
		for (const credential of credentials) {
			const keyId = stringProperty(credential, 'keyId');
			const endDateTime = stringProperty(credential, 'endDateTime');
			if (!keyId || !endDateTime) continue;
			const expiry = Date.parse(endDateTime);
			if (Number.isNaN(expiry) || expiry > now) continue;
			// Best effort: a secret we cannot remove is not a reason to fail a setup.
			await this.graph.request(token, 'POST', `/applications/${objectId}/removePassword`, {
				keyId,
			});
		}
	}

	/**
	 * Steps down through the lifetimes until the tenant accepts one. A tenant
	 * that forbids secrets outright rejects every length, and the user is sent
	 * to the manual setup rather than left with a half-made app.
	 */
	private async addSecret(
		token: string,
		objectId: string,
	): Promise<{ value: string; expiresAt: string }> {
		await this.dropExpiredSecrets(token, objectId);
		let lastCode: string | undefined;

		for (const months of SECRET_LIFETIMES_MONTHS) {
			const endDateTime = new Date();
			endDateTime.setMonth(endDateTime.getMonth() + months);

			const response = await this.graph.request(
				token,
				'POST',
				`/applications/${objectId}/addPassword`,
				{
					passwordCredential: {
						displayName: 'n8n agent channel',
						endDateTime: endDateTime.toISOString(),
					},
				},
			);

			if (response.ok) {
				const value = stringProperty(response.body, 'secretText');
				if (!value) {
					throw new OperationalError('Microsoft created a secret but did not return it.');
				}
				return {
					value,
					expiresAt: stringProperty(response.body, 'endDateTime') ?? endDateTime.toISOString(),
				};
			}
			lastCode = graphErrorCode(response.body);
		}

		throw withTeamsFailure(
			new UserError(
				lastCode === 'Authorization_RequestDenied'
					? 'This organisation does not allow n8n to add a client secret. Use the manual setup.'
					: 'This organisation refused every client secret lifetime n8n offered. Use the manual setup.',
			),
			'secrets_refused',
		);
	}

	/** Without a service principal the app exists but cannot sign in to the tenant. */
	private async createServicePrincipal(token: string, appId: string): Promise<void> {
		const response = await this.graph.request(token, 'POST', '/servicePrincipals', { appId });
		// A principal already present is the desired end state, not a failure.
		if (
			!response.ok &&
			graphErrorCode(response.body) !== 'Request_MultipleObjectsWithSameKeyValue'
		) {
			throw new OperationalError('Could not finish registering the app in this organisation.');
		}
	}

	private registrationError(statusCode: number, code: string | undefined): Error {
		if (statusCode === 403 || code === 'Authorization_RequestDenied') {
			return withTeamsFailure(
				new UserError(
					'This account is not allowed to register applications in the organisation. Ask an administrator, or use the manual setup.',
				),
				'cannot_register_apps',
			);
		}
		return new OperationalError('Microsoft refused to register the app. Try again.');
	}

	/**
	 * Finds the credential a previous run of this agent's setup created, so a
	 * second run updates it rather than registering a second app.
	 */
	private async findProvisionedCredential(options: ProvisionEntraAppOptions): Promise<
		| {
				credential: CredentialsEntity;
				objectId: string;
				secret?: { value: string; expiresAt: string };
		  }
		| undefined
	> {
		const usable = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			options.user,
			{ projectId: options.projectId },
		);

		for (const candidate of usable) {
			if (candidate.type !== BOT_CREDENTIAL_TYPE) continue;
			const credential = await this.credentialsFinderService.findCredentialForUser(
				candidate.id,
				options.user,
				['credential:read'],
			);
			if (!credential) continue;

			const data = await this.credentialsService.decrypt(credential, true);
			const objectId = stringProperty(data, 'entraAppObjectId');
			if (objectId && stringProperty(data, 'provisionedForAgentId') === options.agentId) {
				return { credential, objectId, secret: usableSecret(data) };
			}
		}
		return undefined;
	}

	private async writeBotCredential(input: {
		options: ProvisionEntraAppOptions;
		app: CreatedApp;
		secret: { value: string; expiresAt: string };
		tenantId: string;
		existingCredential?: CredentialsEntity;
	}): Promise<string> {
		// Anything already on the credential is kept. The publish records what it
		// put in the catalogue here, and that note is the only answer `getState`
		// has during the day Microsoft can take to list the app -- rebuilding the
		// data from scratch on a re-run would throw it away.
		// Raw: the default redacts every password field, and this data is written
		// straight back -- so a redacted read would store the blanking sentinel
		// over whatever it did not overwrite.
		const existingData = input.existingCredential
			? ((await this.credentialsService.decrypt(input.existingCredential, true)) as Record<
					string,
					unknown
				>)
			: {};

		// The publish note answers for one app in one directory. A re-run that
		// lands on either a different tenant or a different registration would
		// otherwise carry it across, and `getState` would report a listing the
		// new tenant has never seen -- suppressing the publish that is due.
		const movedIdentity =
			(existingData.tenantId !== undefined && existingData.tenantId !== input.tenantId) ||
			(existingData.clientId !== undefined && existingData.clientId !== input.app.appId);
		if (movedIdentity) {
			delete existingData.publishedTeamsAppId;
			delete existingData.publishedTeamsAppState;
			delete existingData.publishedTeamsAppAt;
		}

		const data = {
			...existingData,
			tenantId: input.tenantId,
			clientId: input.app.appId,
			clientSecret: input.secret.value,
			// Provenance, so a re-run finds this app and the settings view can show
			// when the secret runs out and offer to renew it.
			entraAppObjectId: input.app.objectId,
			provisionedForAgentId: input.options.agentId,
			managerCredentialId: input.options.managerCredentialId,
			secretExpiresAt: input.secret.expiresAt,
		};

		if (input.existingCredential) {
			const encrypted = await this.credentialsService.createEncryptedData({
				id: input.existingCredential.id,
				name: input.existingCredential.name,
				type: BOT_CREDENTIAL_TYPE,
				data,
			});
			await this.credentialsService.update(
				input.existingCredential.id,
				encrypted,
				{ kind: 'user', user: input.options.user },
				data,
			);
			return input.existingCredential.id;
		}

		const created = await this.credentialsService.createUnmanagedCredential(
			{
				name: input.app.displayName,
				type: BOT_CREDENTIAL_TYPE,
				data,
				projectId: input.options.projectId,
			},
			input.options.user,
		);
		return created.id;
	}
}
