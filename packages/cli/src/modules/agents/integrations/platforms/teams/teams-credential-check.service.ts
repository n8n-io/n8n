import type { TeamsCredentialCheck } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { AgentCredentialLookupService } from '../../agent-credential-lookup.service';
import { stringProperty } from '../../integration-helpers';

const TEAMS_CREDENTIAL_TYPE = 'microsoftEntraServicePrincipalApi';

/** The audience the Bot Framework connector issues tokens for. */
const BOT_FRAMEWORK_SCOPE = 'https://api.botframework.com/.default';

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
	async check(projectId: string, credentialId: string): Promise<TeamsCredentialCheck> {
		const data = await this.credentialLookup.decryptForProject(
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

		// Trimmed the way the channel trims them, so the check does not refuse a
		// credential that would actually work.
		const tenantId = stringProperty(data, 'tenantId')?.trim();
		const clientId = stringProperty(data, 'clientId')?.trim();
		const clientSecret = stringProperty(data, 'clientSecret')?.trim();
		if (!tenantId || !clientId || !clientSecret) {
			return { status: 'failed', reason: 'incomplete' };
		}

		try {
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
						scope: BOT_FRAMEWORK_SCOPE,
					}).toString(),
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
					timeout: CHECK_TIMEOUT_MS,
				});

			const body: unknown = response.body;
			const token = stringProperty(body, 'access_token');
			if (response.statusCode === 200 && token) return { status: 'ok' };

			this.logger.debug('[TeamsCredentialCheck] Microsoft refused the credential', {
				statusCode: response.statusCode,
			});
			return { status: 'failed', reason: 'rejected' };
		} catch (error) {
			this.logger.debug('[TeamsCredentialCheck] Could not reach Microsoft', { error });
			return { status: 'failed', reason: 'unreachable' };
		}
	}
}
