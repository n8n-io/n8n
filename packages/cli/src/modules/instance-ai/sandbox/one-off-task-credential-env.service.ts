import { isObjectLiteral, Logger } from '@n8n/backend-common';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { OneOffTaskCredentialInfo } from '@n8n/instance-ai';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { OauthService } from '@/oauth/oauth.service';

import { readAccessToken, readOAuthTokenData } from '../oauth-token-data';

export interface ResolvedOneOffTaskCredentials {
	env: Record<string, string>;
	credentials: OneOffTaskCredentialInfo[];
}

function toUpperSnake(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/[^A-Za-z0-9]+/g, '_')
		.toUpperCase()
		.replace(/^_+|_+$/g, '');
}

/** `googleSheetsOAuth2Api` → `GOOGLE_SHEETS`, `airtableApi` → `AIRTABLE`. */
function envPrefixForCredentialType(type: string): string {
	const base = type.replace(/OAuth2Api$/i, '').replace(/Api$/, '');
	return toUpperSnake(base || type) || 'CREDENTIAL';
}

/**
 * Resolves n8n credentials into environment variables injectable into a
 * one-off task's sandbox command wrapper.
 *
 * Security contract: the returned `env` values must flow only into the
 * scoped-workspace command environment — never into a tool result, an event,
 * or anything the LLM sees. The `credentials` list (ids, names, env var
 * names) is the only part that may be surfaced to the agent.
 *
 * OAuth credentials are refreshed first and expose only the fresh access
 * token — never the refresh token, never the client secret. The user-scoped
 * access check always precedes the project-authorized refresh.
 */
@Service()
export class OneOffTaskCredentialEnvService {
	constructor(
		private readonly logger: Logger,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsService: CredentialsService,
		private readonly oauthService: OauthService,
	) {}

	async resolve(user: User, credentialIds: string[]): Promise<ResolvedOneOffTaskCredentials> {
		const env: Record<string, string> = {};
		const credentials: OneOffTaskCredentialInfo[] = [];
		for (const credentialId of credentialIds) {
			const resolved = await this.resolveOne(user, credentialId);
			Object.assign(env, resolved.env);
			credentials.push(resolved.info);
		}
		return { env, credentials };
	}

	private async resolveOne(
		user: User,
		credentialId: string,
	): Promise<{ env: Record<string, string>; info: OneOffTaskCredentialInfo }> {
		const credential = await this.findForUser(user, credentialId);
		let data = await this.decryptOrThrow(credential);

		const env: Record<string, string> = {};
		const prefix = envPrefixForCredentialType(credential.type);

		if (readOAuthTokenData(data)) {
			data = await this.refreshOAuthData(user, credential, data);
			const tokenData = readOAuthTokenData(data);
			const accessToken = tokenData ? readAccessToken(tokenData) : undefined;
			if (!accessToken) {
				throw new OperationalError(
					`Credential "${credential.name}" has no OAuth access token. Reconnect it and try again.`,
				);
			}
			env[`${prefix}_ACCESS_TOKEN`] = accessToken;
		} else {
			for (const [field, value] of Object.entries(data)) {
				if (typeof value === 'string' && value.length > 0) {
					env[`${prefix}_${toUpperSnake(field)}`] = value;
				}
			}
			if (Object.keys(env).length === 0) {
				throw new OperationalError(
					`Credential "${credential.name}" has no fields that can be provided to the task.`,
				);
			}
		}

		return {
			env,
			info: {
				id: credential.id,
				name: credential.name,
				type: credential.type,
				envVarNames: Object.keys(env),
			},
		};
	}

	private async findForUser(user: User, credentialId: string): Promise<CredentialsEntity> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
		);
		if (!credential) {
			throw new OperationalError(
				`Credential ${credentialId} was not found or you do not have access to it.`,
			);
		}
		return credential;
	}

	private async decryptOrThrow(
		credential: CredentialsEntity,
	): Promise<ICredentialDataDecryptedObject> {
		const data = await this.credentialsService.decrypt(credential, true);
		if (!isObjectLiteral(data) || Object.keys(data).length === 0) {
			throw new OperationalError(`Credential "${credential.name}" could not be decrypted.`);
		}
		return data;
	}

	/** Refresh the OAuth token (best-effort) and re-read the persisted data. */
	private async refreshOAuthData(
		user: User,
		credential: CredentialsEntity,
		data: ICredentialDataDecryptedObject,
	): Promise<ICredentialDataDecryptedObject> {
		const projectId = credential.shared?.[0]?.projectId;
		if (!projectId) {
			this.logger.warn('Skipping OAuth refresh for credential without project sharing', {
				credentialId: credential.id,
			});
			return data;
		}

		const refreshed = await this.oauthService.refreshOAuth2CredentialById(credential.id, projectId);
		if (!refreshed) {
			this.logger.warn('OAuth refresh failed for one-off task credential; using stored token', {
				credentialId: credential.id,
			});
			return data;
		}

		// The refresh persisted new token data — re-read it from the database.
		const reloaded = await this.findForUser(user, credential.id);
		return await this.decryptOrThrow(reloaded);
	}
}
