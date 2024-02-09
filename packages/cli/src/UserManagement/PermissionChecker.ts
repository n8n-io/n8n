import { Service } from 'typedi';
import type { INode, Workflow } from 'n8n-workflow';
import { ApplicationError, NodeOperationError, WorkflowOperationError } from 'n8n-workflow';

import config from '@/config';
import { License } from '@/License';
import { OwnershipService } from '@/services/ownership.service';
import { UserRepository } from '@db/repositories/user.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { ProjectService } from '@/services/project.service';
import { RoleService } from '@/services/role.service';

@Service()
export class PermissionChecker {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly license: License,
		private readonly projectService: ProjectService,
		private readonly roleService: RoleService,
	) {}

	/**
	 * Check if a user is permitted to execute a workflow.
	 *
	 * Allow:
	 * - if user has global scope `workflow:execute`, OR
	 * - if user has project scope `workflow:execute` in any of their roles
	 * in any of the projects where the workflow is accessible, AND if every
	 * credential used by nodes in the workflow is accessible by any of the
	 * projects where the workflow is accessible.
	 */
	async check(workflow: Workflow, userId: string) {
		const user = await this.userRepository.findOneByOrFail({ id: userId });

		if (user.hasGlobalScope('workflow:execute')) return;

		const { roles, projectIds } = await this.projectService.findRolesAndProjects(
			userId,
			workflow.id,
		);

		const scopes = this.roleService.getScopesBy(roles);

		if (!scopes.has('workflow:execute')) {
			throw new ApplicationError('User is not allowed to execute this workflow', {
				extra: { userId, workflowId: workflow.id },
			});
		}

		const credIdsToNodes = this.mapCredIdsToNodes(workflow);

		const workflowCredIds = Object.keys(credIdsToNodes);

		if (workflowCredIds.length === 0) return;

		/**
		 * @TODO We still need to ensure that the workflow's credentials
		 * are in the relevant project IDs. Optimize check.
		 */

		for (const credentialsId of workflowCredIds) {
			const isAccessible = await this.sharedCredentialsRepository.isAccessible(
				credentialsId,
				projectIds,
			);

			if (!isAccessible) {
				const nodeToFlag = credIdsToNodes[credentialsId][0];

				throw new NodeOperationError(nodeToFlag, 'Node has no access to credential', {
					description: 'Please recreate the credential or ask its owner to share it with you.',
					level: 'warning',
				});
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
			await this.ownershipService.getWorkflowOwnerCached(parentWorkflowId);

		const subworkflowOwner = await this.ownershipService.getWorkflowOwnerCached(subworkflow.id);

		const description =
			subworkflowOwner.id === parentWorkflowOwner.id
				? 'Change the settings of the sub-workflow so it can be called by this one.'
				: `${subworkflowOwner.firstName} (${subworkflowOwner.email}) can make this change. You may need to tell them the ID of the sub-workflow, which is ${subworkflow.id}`;

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

	private mapCredIdsToNodes(workflow: Workflow) {
		return Object.values(workflow.nodes).reduce<{ [credentialId: string]: INode[] }>(
			(map, node) => {
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
			},
			{},
		);
	}
}
