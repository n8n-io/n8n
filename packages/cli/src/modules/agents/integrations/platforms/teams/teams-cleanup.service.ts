import type { AgentIntegrationDisconnectWarning } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { AgentCredentialLookupService } from '../../agent-credential-lookup.service';
import { stringProperty } from '../../integration-helpers';

const BOT_CREDENTIAL_TYPE = 'microsoftEntraServicePrincipalApi';
const ENTRA_APPS_URL =
	'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade';

export interface TeamsCleanupContext {
	projectId: string;
	credentialId: string;
}

/**
 * Disconnecting deletes nothing in the customer's Microsoft tenant.
 *
 * The pieces depend on each other, and one of them — the catalogued Teams app —
 * may have been approved by an administrator and installed by colleagues.
 * Removing the Entra app while that stays leaves an app that is installed for
 * other people and silently broken, which is worse than leaving both. So the
 * user is told what remains and where to remove it.
 */
@Service()
export class TeamsCleanupService {
	constructor(private readonly credentialLookup: AgentCredentialLookupService) {}

	async describeLeftovers(
		ctx: TeamsCleanupContext,
	): Promise<AgentIntegrationDisconnectWarning | undefined> {
		if (!ctx.credentialId) return undefined;

		const data = await this.credentialLookup.decryptForProject(
			ctx.projectId,
			ctx.credentialId,
			BOT_CREDENTIAL_TYPE,
		);
		// Only an app n8n registered is worth warning about. A credential the user
		// made by hand is theirs to keep, and they know where it is.
		if (!data || !stringProperty(data, 'entraAppObjectId')) return undefined;

		return {
			integrationType: 'teams',
			code: 'resources_not_deleted',
			action: { type: 'open_url', url: ENTRA_APPS_URL },
			details: {
				appId: stringProperty(data, 'clientId') ?? '',
			},
		};
	}
}
