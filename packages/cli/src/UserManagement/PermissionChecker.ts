import { Service } from 'typedi';
import type { INode, Workflow } from 'n8n-workflow';
import { CredentialAccessError, NodeOperationError, WorkflowOperationError } from 'n8n-workflow';

import config from '@/config';
import { License } from '@/License';
import { OwnershipService } from '@/services/ownership.service';
import { UserRepository } from '@db/repositories/user.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';

@Service()
export class PermissionChecker {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly ownershipService: OwnershipService,
		private readonly license: License,
	) {}

	/**
	 * Check if a user is permitted to execute a workflow.
	 */
	async check(workflowId: string, userId: string, nodes: INode[]) {
		// allow if no nodes in this workflow use creds

		const credIdsToNodes = this.mapCredIdsToNodes(nodes);

		const workflowCredIds = Object.keys(credIdsToNodes);

		if (workflowCredIds.length === 0) return;

		// allow if requesting user is instance owner

		const user = await this.userRepository.findOneOrFail({
			where: { id: userId },
		});

		if (user.hasGlobalScope('workflow:execute')) return;

		const isSharingEnabled = this.license.isSharingEnabled();

		// allow if all creds used in this workflow are a subset of
		// all creds accessible to users who have access to this workflow

		let workflowUserIds = [userId];

		if (workflowId && isSharingEnabled) {
			workflowUserIds = await this.sharedWorkflowRepository.getSharedUserIds(workflowId);
		}

		const accessibleCredIds = isSharingEnabled
			? await this.sharedCredentialsRepository.getAccessibleCredentialIds(workflowUserIds)
			: await this.sharedCredentialsRepository.getOwnedCredentialIds(workflowUserIds);

		const inaccessibleCredIds = workflowCredIds.filter((id) => !accessibleCredIds.includes(id));

		if (inaccessibleCredIds.length === 0) return;

		// if disallowed, flag only first node using first inaccessible cred
		const inaccessibleCredId = inaccessibleCredIds[0];
		const nodeToFlag = credIdsToNodes[inaccessibleCredId][0];

		throw new CredentialAccessError(nodeToFlag, inaccessibleCredId, workflowId);
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
