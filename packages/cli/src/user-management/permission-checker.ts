import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { CredentialAccessError, NodeOperationError } from 'n8n-workflow';

import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';

@Service()
export class PermissionChecker {
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
		if (homeProject.type === 'personal' && homeProjectOwner?.hasGlobalScope('credential:list')) {
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
				throw new CredentialAccessError(nodeToFlag, credentialsId, workflowId);
			}
		}
	}

	private mapCredIdsToNodes(nodes: INode[]) {
		return nodes.reduce<{ [credentialId: string]: INode[] }>((map, node) => {
			if (node.disabled || !node.credentials) return map;

			Object.values(node.credentials).forEach((cred) => {
				if (!cred.id) {
					throw new NodeOperationError(node, 'Node uses invalid credential', {
						description: 'Please recreate the credential.',
						level: 'warning',
					});
				}

				map[cred.id] = map[cred.id] ? [...map[cred.id], node] : [node];
			});

			return map;
		}, {});
	}
}
