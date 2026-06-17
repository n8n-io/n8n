import type { CredentialProvider, ResolvedCredential, CredentialListItem } from '@n8n/agents';
import type { CredentialsEntity, User } from '@n8n/db';

import type { CredentialsService } from '@/credentials/credentials.service';

function toResolvedCredential(data: unknown): ResolvedCredential {
	const resolved = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
	const apiKey = 'apiKey' in resolved && typeof resolved.apiKey === 'string' ? resolved.apiKey : '';

	return { ...resolved, apiKey };
}

/**
 * Resolves and lists n8n credentials for use by SDK agents.
 *
 * This is not a DI-managed singleton — a new instance is created per request,
 * scoped to a specific project. When a request user is provided, list/resolve
 * follows the same credential set as the workflow editor for that project.
 * Published runtime execution can omit the user and stays project-scoped.
 */
export class AgentsCredentialProvider implements CredentialProvider {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly projectId: string,
		private readonly user?: User,
	) {}

	/**
	 * Resolve a credential by ID, then decrypt and return the raw data.
	 *
	 * Only credentials visible to this provider's scope are considered.
	 */
	async resolve(credentialId: string): Promise<ResolvedCredential> {
		const credential = await this.findCredentialEntity(credentialId);

		if (!credential) {
			throw new Error(`Credential "${credentialId}" not found or not accessible`);
		}

		const data = await this.credentialsService.decrypt(credential, true);
		return toResolvedCredential(data);
	}

	/**
	 * List all credentials available in this provider's scope.
	 */
	async list(): Promise<CredentialListItem[]> {
		if (this.user) {
			// this fetches intersection of project and global credentials the user has access to
			// credentials available to project but not user are not listed
			// used to limit available credentials to the user's access when calling agent builder
			const accessible = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
				this.user,
				{
					projectId: this.projectId,
				},
			);

			return accessible.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
			}));
		}

		// this fetches all credentials accessible to the project
		const accessible = await this.getAllProjectAndGlobalCredentials();

		return accessible.map((c) => ({
			id: c.id,
			name: c.name,
			type: c.type,
		}));
	}

	private async findCredentialEntity(credentialId: string): Promise<CredentialsEntity | null> {
		const accessible = await this.getAllProjectAndGlobalCredentials();
		return accessible.find((c) => c.id === credentialId) ?? null;
	}

	private async getAllProjectAndGlobalCredentials(): Promise<CredentialsEntity[]> {
		const projectCredentials = await this.credentialsService.findAllCredentialIdsForProject(
			this.projectId,
		);
		const globalCredentials = await this.credentialsService.findAllGlobalCredentialIds(true);
		const allCredsSet = new Set();
		const allCreds: CredentialsEntity[] = [];

		const addCreds = (creds: CredentialsEntity[]) => {
			for (const cred of creds) {
				if (!allCredsSet.has(cred.id)) {
					allCredsSet.add(cred.id);
					allCreds.push(cred);
				}
			}
		};

		addCreds(projectCredentials);
		addCreds(globalCredentials);

		return allCreds;
	}
}
