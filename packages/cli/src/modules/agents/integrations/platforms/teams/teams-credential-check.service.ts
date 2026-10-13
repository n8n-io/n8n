import type { TeamsCredentialCheck, TeamsFileAccessCheck } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';

import { AgentCredentialLookupService } from '../../agent-credential-lookup.service';
import { stringProperty } from '../../integration-helpers';

const TEAMS_CREDENTIAL_TYPE = 'microsoftEntraServicePrincipalApi';

/** The audience the Bot Framework connector issues tokens for. */
const BOT_FRAMEWORK_SCOPE = 'https://api.botframework.com/.default';

/** Graph lists the app permissions it granted in the token's `roles` claim. */
const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';
const FILES_READ_ALL = 'Files.Read.All';

/** The only cloud the Teams channel reaches, matching what the channel enforces. */
const GLOBAL_GRAPH_API_BASE_URL = 'https://graph.microsoft.com';

/**
 * The check gates a button, so a Microsoft connection that opens and then
 * stalls has to give up long before the instance-wide request timeout.
 */
const CHECK_TIMEOUT_MS = 30_000;

@Service()
export class TeamsCredentialCheckService {
	constructor(
		private readonly credentialLookup: AgentCredentialLookupService,
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {}

	/**
	 * Mints a token exactly as the channel will, so the check fails for the same
	 * reasons the channel would: a wrong secret, a wrong tenant, a wrong client
	 * ID. Anything short of a real token is not evidence the channel will work.
	 */
	async check(user: User, projectId: string, credentialId: string): Promise<TeamsCredentialCheck> {
		// Scoped to the caller, not just the project: this mints a real token, and
		// naming a credential is not the same as being allowed to use it.
		const data = await this.credentialLookup.decryptForUser(
			user,
			projectId,
			credentialId,
			TEAMS_CREDENTIAL_TYPE,
		);
		if (!data) return { status: 'failed', reason: 'incomplete' };

		// The channel rejects certificate mode outright: it stores no client
		// secret, so there is nothing to mint a token with.
		if (stringProperty(data, 'authentication') === 'certificate') {
			return { status: 'failed', reason: 'certificate' };
		}

		// The channel refuses a non-global cloud, so accepting one here would let
		// the setup pass on a credential the first message rejects.
		const graphApiBaseUrl = stringProperty(data, 'graphApiBaseUrl');
		if (graphApiBaseUrl && graphApiBaseUrl.replace(/\/+$/, '') !== GLOBAL_GRAPH_API_BASE_URL) {
			return { status: 'failed', reason: 'cloud' };
		}

		const secret = clientSecretOf(data);
		if (!secret) return { status: 'failed', reason: 'incomplete' };

		try {
			const response = await this.requestToken(secret, BOT_FRAMEWORK_SCOPE);
			if (response.token) return { status: 'ok' };

			this.logger.debug('[TeamsCredentialCheck] Microsoft refused the credential', {
				statusCode: response.statusCode,
			});
			return { status: 'failed', reason: 'rejected' };
		} catch (error) {
			this.logger.debug('[TeamsCredentialCheck] Could not reach Microsoft', { error });
			return { status: 'failed', reason: 'unreachable' };
		}
	}

	/**
	 * Reads the grant from a fresh Graph token rather than asking Graph about
	 * the app, which would need a permission the bot does not hold.
	 */
	async checkFileAccess(
		user: User,
		projectId: string,
		credentialId: string,
	): Promise<TeamsFileAccessCheck> {
		const data = await this.credentialLookup.decryptForUser(
			user,
			projectId,
			credentialId,
			TEAMS_CREDENTIAL_TYPE,
		);
		const secret = clientSecretOf(data);
		if (!secret) return { status: 'unknown' };

		try {
			const { token } = await this.requestToken(secret, GRAPH_SCOPE);
			if (!token) return { status: 'unknown' };
			return { status: rolesOf(token).includes(FILES_READ_ALL) ? 'approved' : 'notApproved' };
		} catch (error) {
			this.logger.debug('[TeamsCredentialCheck] Could not read the file access grant', { error });
			return { status: 'unknown' };
		}
	}

	private async requestToken(
		{ tenantId, clientId, clientSecret }: ClientSecret,
		scope: string,
	): Promise<{ statusCode: number; token?: string }> {
		const response = await this.outboundHttp
			// Fixed public vendor host, not user-controllable.
			.requests({ useDefaultSsrfPolicy: 'unsafe' })
			.request({
				method: 'POST',
				url: `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					grant_type: 'client_credentials',
					client_id: clientId,
					client_secret: clientSecret,
					scope,
				}).toString(),
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				timeout: CHECK_TIMEOUT_MS,
			});
		const body: unknown = response.body;
		const token = stringProperty(body, 'access_token');
		return {
			statusCode: response.statusCode,
			token: response.statusCode === 200 ? token : undefined,
		};
	}
}

interface ClientSecret {
	tenantId: string;
	clientId: string;
	clientSecret: string;
}

/** Trimmed the way the channel trims them, so a working credential is not refused. */
function clientSecretOf(data: unknown): ClientSecret | undefined {
	const tenantId = stringProperty(data, 'tenantId')?.trim();
	const clientId = stringProperty(data, 'clientId')?.trim();
	const clientSecret = stringProperty(data, 'clientSecret')?.trim();
	return tenantId && clientId && clientSecret ? { tenantId, clientId, clientSecret } : undefined;
}

/**
 * The token comes straight from Microsoft over TLS, so its payload is read
 * without verifying the signature.
 */
function rolesOf(token: string): string[] {
	const payload: unknown = jsonParse(
		Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
		{ fallbackValue: {} },
	);
	const roles = isRecord(payload) ? payload.roles : undefined;
	return Array.isArray(roles)
		? roles.filter((role): role is string => typeof role === 'string')
		: [];
}
