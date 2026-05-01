import type { CredentialProvider, ResolvedCredential, CredentialListItem } from '@n8n/agents';

import type { CredentialsService } from '@/credentials/credentials.service';

/**
 * Resolves and lists n8n credentials for use by SDK agents.
 *
 * This is not a DI-managed singleton — a new instance is created per request,
 * scoped to a specific project. Agents always belong to a project, so credential
 * access is always project-scoped, matching how workflow execution resolves
 * credentials and preventing cross-project credential leakage.
 */
export class AgentsCredentialProvider implements CredentialProvider {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly projectId: string,
	) {}

	/**
	 * Resolve a credential by ID or name, then decrypt and return the raw data.
	 *
	 * Only credentials shared with the agent's project are considered. ID is
	 * tried first, then name (case-insensitive).
	 */
	async resolve(credentialIdOrName: string): Promise<ResolvedCredential> {
		const projectCredentials = await this.credentialsService.findAllCredentialIdsForProject(
			this.projectId,
		);

		const credential =
			projectCredentials.find((c) => c.id === credentialIdOrName) ??
			projectCredentials.find((c) => c.name.toLowerCase() === credentialIdOrName.toLowerCase()) ??
			null;

		if (!credential) {
			throw new Error(`Credential "${credentialIdOrName}" not found or not accessible`);
		}

		const data = await this.credentialsService.decrypt(credential, true);
		const apiKey = typeof data.apiKey === 'string' ? data.apiKey : '';

		return { ...data, apiKey };
	}

	/**
	 * List all credentials shared with the agent's project.
	 */
	async list(): Promise<CredentialListItem[]> {
		const projectCredentials = await this.credentialsService.findAllCredentialIdsForProject(
			this.projectId,
		);

		return projectCredentials.map((c) => ({
			id: c.id,
			name: c.name,
			type: c.type,
		}));
	}
}
