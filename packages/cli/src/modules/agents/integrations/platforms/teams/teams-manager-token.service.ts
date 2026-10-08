import { OutboundHttp } from '@n8n/backend-network';
import { Logger } from '@n8n/backend-common';
import { type CredentialsEntity, CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { BadRequestError } from '@n8n/errors';
import { OperationalError } from 'n8n-workflow';

import { TEAMS_MANAGER_CREDENTIAL_TYPE } from './teams-managed-setup.service';
import { stringProperty } from '../../integration-helpers';

// `organizations`, matching the sign-in: a personal account has no Teams
// organisation, so it is refused at the door rather than several steps in.
const TOKEN_ENDPOINT = 'https://login.microsoftonline.com/organizations/oauth2/v2.0/token';
const TOKEN_TIMEOUT_MS = 30_000;

export const GRAPH_RESOURCE = 'https://graph.microsoft.com';
export const AZURE_RESOURCE = 'https://management.azure.com';

/** Entra issues one token per resource, so the caller says which one it needs. */
export type ManagerResource = typeof GRAPH_RESOURCE | typeof AZURE_RESOURCE;

/** Named for the user, who knows these as two Microsoft products, not two hosts. */
function resourceName(resource: ManagerResource): string {
	return resource === AZURE_RESOURCE ? 'Azure' : 'Microsoft Graph';
}

export const RESOURCE_SCOPES: Record<ManagerResource, string> = {
	[GRAPH_RESOURCE]: [
		'offline_access',
		`${GRAPH_RESOURCE}/Application.ReadWrite.All`,
		`${GRAPH_RESOURCE}/TeamsAppInstallation.ReadForUser`,
		`${GRAPH_RESOURCE}/User.Read`,
	].join(' '),
	[AZURE_RESOURCE]: ['offline_access', `${AZURE_RESOURCE}/user_impersonation`].join(' '),
};

/**
 * A refresh redeemed for one resource answers with that resource's scopes and
 * no others. Recording them as they arrive shrinks the record of what the
 * sign-in granted, and the setup then reads a working sign-in as incomplete and
 * asks for another one, which the next call shrinks again.
 *
 * A scope that was really withdrawn is not hidden by this for long: the
 * exchange that needs it fails, which is the honest signal.
 */
function mergeScopes(stored: string | undefined, granted: string): string {
	const all = [...(stored ?? '').split(' '), ...granted.split(' ')].filter(Boolean);
	return [...new Set(all)].join(' ');
}

/**
 * Turns the one Microsoft sign-in into the per-resource tokens the provisioning
 * steps need.
 *
 * Entra issues an access token for a single resource, but a refresh token is
 * bound to the user and the client rather than to a resource. So the sign-in
 * consents to Graph and Azure together, and each call here redeems the stored
 * refresh token for whichever resource it was asked for.
 *
 * A token request must never name scopes from two resources at once; Entra
 * rejects that outright, which is why the scope strings are per resource.
 */
@Service()
export class TeamsManagerTokenService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsOverwrites: CredentialsOverwrites,
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {}

	/**
	 * One redemption at a time for a given credential. Entra invalidates the
	 * refresh token it was called with and answers with a new one, so two calls
	 * that overlap both redeem the same token: the slower one stores a token
	 * Microsoft has already retired, and the next call signs the user out. The
	 * install step polls while a publish may be running, so the overlap is
	 * ordinary rather than rare.
	 */
	private readonly inFlight = new Map<string, Promise<string>>();

	async acquire(credential: CredentialsEntity, resource: ManagerResource): Promise<string> {
		if (credential.type !== TEAMS_MANAGER_CREDENTIAL_TYPE) {
			throw new BadRequestError('That credential is not a Microsoft setup sign-in.');
		}

		// Keyed on the credential, not the resource: every resource redeems the
		// same refresh token, so a Graph call and an Azure call race just as two
		// Graph calls would.
		const running = this.inFlight.get(credential.id);
		const next = running
			? running.then(
					async () => await this.redeem(credential, resource),
					async () => await this.redeem(credential, resource),
				)
			: this.redeem(credential, resource);

		this.inFlight.set(credential.id, next);
		next
			.finally(() => {
				if (this.inFlight.get(credential.id) === next) this.inFlight.delete(credential.id);
			})
			.catch(() => {});
		return await next;
	}

	private async redeem(credential: CredentialsEntity, resource: ManagerResource): Promise<string> {
		// Queueing alone is not enough: a caller that read its entity before the
		// call ahead of it rotated the token still holds the spent one. The row is
		// read again here so the queued call redeems what Entra last issued.
		const current =
			(await this.credentialsRepository.findOneBy({ id: credential.id })) ?? credential;
		const rawData = await this.credentialsService.decrypt(current, true);
		const tokenData = this.tokenDataOf(rawData);
		const refreshToken = stringProperty(tokenData, 'refresh_token');
		if (!refreshToken) {
			throw new BadRequestError('Sign in with Microsoft again to continue.');
		}

		const client = this.clientCredentials();
		const response = await this.outboundHttp
			// Fixed public vendor host, not user-controllable.
			.requests({ useDefaultSsrfPolicy: 'unsafe' })
			.request({
				method: 'POST',
				url: TOKEN_ENDPOINT,
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: refreshToken,
					client_id: client.clientId,
					client_secret: client.clientSecret,
					scope: RESOURCE_SCOPES[resource],
				}).toString(),
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				timeout: TOKEN_TIMEOUT_MS,
			});

		const body: unknown = response.body;
		const accessToken = stringProperty(body, 'access_token');
		if (response.statusCode !== 200 || !accessToken) {
			// The body carries the token on success, so it is never logged.
			// `error` alone never says which of a dozen causes it was. The
			// description carries the AADSTS code that names it, and the refusal
			// body holds no token, so all of it is safe to log.
			this.logger.debug('[TeamsManagerToken] Microsoft refused the refresh', {
				statusCode: response.statusCode,
				resource,
				error: stringProperty(body, 'error'),
				suberror: stringProperty(body, 'suberror'),
				errorDescription: stringProperty(body, 'error_description'),
			});
			// `invalid_grant` is what Entra answers once the stored consent no longer
			// matches the app registration — which is exactly what changing its
			// permissions does. It is not a transient failure; only a fresh sign-in
			// clears it.
			//
			// It is refused for one resource at a time, and a sign-in that reaches
			// Graph but not Azure is the common case: saying "no longer valid" of a
			// sign-in that plainly works sends the user to fix the wrong thing.
			throw new OperationalError(
				stringProperty(body, 'error') === 'invalid_grant'
					? `This Microsoft sign-in does not reach ${resourceName(resource)}. Sign in again, and make sure the organisation approved n8n for it.`
					: `Microsoft would not issue a token for ${resourceName(resource)}. Sign in again and retry.`,
			);
		}

		await this.persistRotatedRefreshToken(credential, rawData, tokenData, body);
		return accessToken;
	}

	/**
	 * Entra replaces the refresh token on every use, so the new one has to be
	 * stored or the next call signs the user out.
	 */
	private async persistRotatedRefreshToken(
		credential: CredentialsEntity,
		rawData: ICredentialDataDecryptedObject,
		tokenData: Record<string, unknown>,
		body: unknown,
	): Promise<void> {
		const rotated = stringProperty(body, 'refresh_token');
		if (!rotated) return;

		const oauthTokenData: Record<string, unknown> = { ...tokenData, refresh_token: rotated };
		const scope = stringProperty(body, 'scope');
		if (scope !== undefined) {
			oauthTokenData.scope = mergeScopes(stringProperty(tokenData, 'scope'), scope);
		}

		// Token data is an opaque provider blob. `oauth2-credential.controller`
		// narrows it the same way when it stores the first grant.
		const updated = { ...rawData, oauthTokenData } as ICredentialDataDecryptedObject;
		const encrypted = await this.credentialsService.createEncryptedData({
			id: credential.id,
			name: credential.name,
			type: credential.type,
			data: updated,
		});
		// Entra hands back a new refresh token on every use, so this write is the
		// integration keeping its own credential alive rather than anything the
		// signed-in user asked for.
		await this.credentialsService.update(
			credential.id,
			encrypted,
			{ kind: 'system', reason: 'integration' },
			updated,
		);

		// The caller still holds this entity, and `decrypt` reads the copy it is
		// given. Leaving the spent token on it lets a later write put it back over
		// the live one.
		if (encrypted.data) credential.data = encrypted.data;
	}

	private tokenDataOf(rawData: ICredentialDataDecryptedObject): Record<string, unknown> {
		const tokenData = (rawData as Record<string, unknown>).oauthTokenData;
		return isRecord(tokenData) ? tokenData : {};
	}

	private clientCredentials(): { clientId: string; clientSecret: string } {
		const overwrite = this.credentialsOverwrites.getOverwrites(TEAMS_MANAGER_CREDENTIAL_TYPE);
		const clientId = typeof overwrite?.clientId === 'string' ? overwrite.clientId.trim() : '';
		const clientSecret =
			typeof overwrite?.clientSecret === 'string' ? overwrite.clientSecret.trim() : '';
		if (!clientId || !clientSecret) {
			throw new BadRequestError('The recommended Microsoft Teams setup is not available here.');
		}
		return { clientId, clientSecret };
	}
}
