import type { Project } from '@n8n/db';
import { SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { INode } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';

class InvalidCredentialError extends UserError {
	override description = 'Please recreate the credential.';

	constructor(readonly node: INode) {
		super(`Node "${node.name}" uses invalid credential`);
	}
}

class InaccessibleCredentialError extends UserError {
	override description =
		this.project.type === 'personal'
			? 'Please recreate the credential or ask its owner to share it with you.'
			: `Please make sure that the credential is shared with the project "${this.project.name}"`;

	constructor(
		readonly node: INode,
		private readonly project: Project,
	) {
		super(`Node "${node.name}" does not have access to the credential`);
	}
}

@Service()
export class CredentialsPermissionChecker {
	constructor(
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly projectService: ProjectService,
	) {}

	/**
	 * Check if a workflow has the ability to execute based on the projects it's apart of.
	 */
	async check(workflowId: string, nodes: INode[]) {
		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflowId);
		const homeProjectOwner = await this.ownershipService.getPersonalProjectOwnerCached(
			homeProject.id,
		);
		if (
			homeProject.type === 'personal' &&
			homeProjectOwner &&
			hasGlobalScope(homeProjectOwner, 'credential:list')
		) {
			// Workflow belongs to a project by a user with privileges
			// so all credentials are usable. Skip credential checks.
			return;
		}
		const projectIds = await this.projectService.findProjectsWorkflowIsIn(workflowId);
		const credIdsToNodes = this.mapCredIdsToNodes(nodes);

		const workflowCredIds = Object.keys(credIdsToNodes);

		if (workflowCredIds.length === 0) return;

		const accessible = await this.sharedCredentialsRepository.getFilteredAccessibleCredentials(
			projectIds,
			workflowCredIds,
		);

		for (const credentialsId of workflowCredIds) {
			if (!accessible.includes(credentialsId)) {
				const nodeToFlag = credIdsToNodes[credentialsId][0];
				throw new InaccessibleCredentialError(nodeToFlag, homeProject);
			}
		}
	}

	private mapCredIdsToNodes(nodes: INode[]) {
		return nodes.reduce<{ [credentialId: string]: INode[] }>((map, node) => {
			if (node.disabled || !node.credentials) return map;

			Object.values(node.credentials).forEach((cred) => {
				if (!cred.id) throw new InvalidCredentialError(node);

				map[cred.id] = map[cred.id] ? [...map[cred.id], node] : [node];
			});

			return map;
		}, {});
	}
}
