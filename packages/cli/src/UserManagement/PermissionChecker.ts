import { Service } from 'typedi';
import type { INode, Workflow } from 'n8n-workflow';
import { CredentialAccessError, NodeOperationError, WorkflowOperationError } from 'n8n-workflow';

import config from '@/config';
import { License } from '@/License';
import { OwnershipService } from '@/services/ownership.service';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { ProjectService } from '@/services/project.service';

@Service()
export class PermissionChecker {
	constructor(
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly license: License,
		private readonly projectService: ProjectService,
	) {}

	/**
	 * Check if a workflow has the ability to execute based on the projects it's apart of.
	 */
	async check(workflowId: string, nodes: INode[]) {
		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflowId);
		const homeProjectOwner = await this.ownershipService.getProjectOwnerCached(homeProject.id);
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

	async checkSubworkflowExecutePolicy(
		subworkflow: Workflow,
		parentWorkflowId: string,
		node?: INode,
	) {
		/**
		 * Important considerations: both the current workflow and the parent can have empty IDs.
		 * This happens when a user is executing an unsaved workflow manually running a workflow
		 * loaded from a file or code, for instance.
		 * This is an important topic to keep in mind for all security checks
		 */
		if (!subworkflow.id) {
			// It's a workflow from code and not loaded from DB
			// No checks are necessary since it doesn't have any sort of settings
			return;
		}

		let policy =
			subworkflow.settings?.callerPolicy ?? config.getEnv('workflows.callerPolicyDefaultOption');

		if (!this.license.isSharingEnabled()) {
			// Community version allows only same owner workflows
			policy = 'workflowsFromSameOwner';
		}

		const parentWorkflowOwner =
			await this.ownershipService.getWorkflowProjectCached(parentWorkflowId);

		const subworkflowOwner = await this.ownershipService.getWorkflowProjectCached(subworkflow.id);

		const description =
			subworkflowOwner.id === parentWorkflowOwner.id
				? 'Change the settings of the sub-workflow so it can be called by this one.'
				: `An admin for the ${subworkflowOwner.name} project can make this change. You may need to tell them the ID of the sub-workflow, which is ${subworkflow.id}`;

		const errorToThrow = new WorkflowOperationError(
			`Target workflow ID ${subworkflow.id} may not be called`,
			node,
			description,
		);

		if (policy === 'none') {
			throw errorToThrow;
		}

		if (policy === 'workflowsFromAList') {
			if (parentWorkflowId === undefined) {
				throw errorToThrow;
			}
			const allowedCallerIds = subworkflow.settings.callerIds
				?.split(',')
				.map((id) => id.trim())
				.filter((id) => id !== '');

			if (!allowedCallerIds?.includes(parentWorkflowId)) {
				throw errorToThrow;
			}
		}

		if (policy === 'workflowsFromSameOwner' && subworkflowOwner?.id !== parentWorkflowOwner.id) {
			throw errorToThrow;
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
