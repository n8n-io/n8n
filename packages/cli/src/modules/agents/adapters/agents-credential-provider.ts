import type { CredentialProvider, ResolvedCredential, CredentialListItem } from '@n8n/agents';
import type { CredentialsEntity, User } from '@n8n/db';

import type { CredentialsService } from '@/credentials/credentials.service';

function toResolvedCredential(data: unknown): ResolvedCredential {
	const resolved = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
	const apiKey = 'apiKey' in resolved && typeof resolved.apiKey === 'string' ? resolved.apiKey : '';

	return { ...resolved, apiKey };
}

function findCredential<T extends Pick<CredentialListItem, 'id' | 'name'>>(
	credentials: T[],
	credentialIdOrName: string,
): T | null {
	return (
		credentials.find((c) => c.id === credentialIdOrName) ??
		credentials.find((c) => c.name.toLowerCase() === credentialIdOrName.toLowerCase()) ??
		null
	);
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
	 * Resolve a credential by ID or name, then decrypt and return the raw data.
	 *
	 * Only credentials visible to this provider's scope are considered. ID is
	 * tried first, then name (case-insensitive).
	 */
	async resolve(credentialIdOrName: string): Promise<ResolvedCredential> {
		const credential = await this.findCredentialEntity(credentialIdOrName);

		if (!credential) {
			throw new Error(`Credential "${credentialIdOrName}" not found or not accessible`);
		}

		const data = await this.credentialsService.decrypt(credential, true);
		return toResolvedCredential(data);
	}

	/**
	 * List all credentials available in this provider's scope.
	 */
	async list(): Promise<CredentialListItem[]> {
		if (this.user) {
			const workflowCredentials =
				await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(this.user, {
					projectId: this.projectId,
				});

			return workflowCredentials.map((c) => ({
				id: c.id,
				name: c.name,
				type: c.type,
			}));
		}

		const projectCredentials = await this.credentialsService.findAllCredentialIdsForProject(
			this.projectId,
		);

		return projectCredentials.map((c) => ({
			id: c.id,
			name: c.name,
			type: c.type,
		}));
	}

	private async findCredentialEntity(
		credentialIdOrName: string,
	): Promise<CredentialsEntity | null> {
		if (!this.user) {
			const projectCredentials = await this.credentialsService.findAllCredentialIdsForProject(
				this.projectId,
			);
			return findCredential(projectCredentials, credentialIdOrName);
		}

		const scopedCredential = findCredential(await this.list(), credentialIdOrName);
		if (!scopedCredential) return null;

		const projectCredentials = await this.credentialsService.findAllCredentialIdsForProject(
			this.projectId,
		);
		const projectCredential = projectCredentials.find((c) => c.id === scopedCredential.id);
		if (projectCredential) return projectCredential;

		const globalCredentials = await this.credentialsService.findAllGlobalCredentialIds(true);
		return globalCredentials.find((c) => c.id === scopedCredential.id) ?? null;
	}
}
