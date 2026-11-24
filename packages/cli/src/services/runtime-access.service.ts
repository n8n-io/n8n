import { ProjectScopeService } from '@n8n/backend-services';
import { CredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope, SecurityContext } from '@n8n/permissions';

import { ProjectService } from '@/services/project.service.ee';

/** A resource that a run uses while it executes. */
export type RuntimeResource =
	| { type: 'credential'; id: string }
	| { type: 'workflow'; id: string }
	| { type: 'dataTable'; projectId: string; access: 'read' | 'write' };

const DATA_TABLE_SCOPES: Record<'read' | 'write', Scope[]> = {
	read: ['dataTable:read', 'dataTable:readRow'],
	write: ['dataTable:read', 'dataTable:writeRow'],
};

/**
 * One check for what a run may use, decided by who runs (the subject of the
 * security context), not by the project that holds the resource.
 *
 * The subject is the account whose authority the run uses. For a sub-agent,
 * that is still the parent agent (on behalf of).
 */
@Service()
export class RuntimeAccessService {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly projectScopeService: ProjectScopeService,
		private readonly projectService: ProjectService,
	) {}

	async canUse(security: SecurityContext, resource: RuntimeResource): Promise<boolean> {
		switch (resource.type) {
			case 'credential':
				return (await this.usableCredentialIds(security, [resource.id])).has(resource.id);
			case 'workflow':
				return await this.canRunWorkflow(security, resource.id);
			case 'dataTable':
				return await this.projectScopeService.hasScopes(
					security.subject,
					resource.projectId,
					DATA_TABLE_SCOPES[resource.access],
				);
		}
	}

	/**
	 * The ids among `credentialIds` that the subject can use: the credentials of
	 * each project it belongs to, the ones shared with it, and global ones.
	 */
	async usableCredentialIds(
		security: SecurityContext,
		credentialIds: string[],
	): Promise<Set<string>> {
		const usable = await this.findUsableCredentials(security, credentialIds);
		return new Set(usable.map((credential) => credential.id));
	}

	/** Like {@link usableCredentialIds}, with the name and type of each credential. */
	async findUsableCredentials(security: SecurityContext, credentialIds: string[]) {
		return await this.credentialsRepository.findCredentialsUsableByAccount(
			security.subject.id,
			credentialIds,
		);
	}

	/** The subject may run the workflow in one of the projects that hold it. */
	private async canRunWorkflow(security: SecurityContext, workflowId: string): Promise<boolean> {
		const projectIds = await this.projectService.findProjectsWorkflowIsIn(workflowId);
		for (const projectId of projectIds) {
			if (
				await this.projectScopeService.hasScopes(security.subject, projectId, ['workflow:execute'])
			) {
				return true;
			}
		}
		return false;
	}
}
