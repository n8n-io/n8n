import {
	INode,
	NodeOperationError,
	SubworkflowOperationError,
	Workflow,
	WorkflowOperationError,
} from 'n8n-workflow';
import { FindManyOptions, In, ObjectLiteral } from 'typeorm';
import * as Db from '@/Db';
import config from '@/config';
import type { SharedCredentials } from '@db/entities/SharedCredentials';
import { getRole, isSharingEnabled } from './UserManagementHelper';
import { WorkflowsService } from '@/workflows/workflows.services';
import { UserService } from '@/user/user.service';

export class PermissionChecker {
	/**
	 * Check if a user is permitted to execute a workflow.
	 */
	static async check(workflow: Workflow, userId: string) {
		// allow if no nodes in this workflow use creds

		const credIdsToNodes = PermissionChecker.mapCredIdsToNodes(workflow);

		const workflowCredIds = Object.keys(credIdsToNodes);

		if (workflowCredIds.length === 0) return;

		// allow if requesting user is instance owner

		const user = await Db.collections.User.findOneOrFail(userId, {
			relations: ['globalRole'],
		});

		if (user.globalRole.name === 'owner') return;

		// allow if all creds used in this workflow are a subset of
		// all creds accessible to users who have access to this workflow

		let workflowUserIds = [userId];

		if (workflow.id && isSharingEnabled()) {
			const workflowSharings = await Db.collections.SharedWorkflow.find({
				relations: ['workflow'],
				where: { workflow: { id: Number(workflow.id) } },
			});
			workflowUserIds = workflowSharings.map((s) => s.userId);
		}

		const credentialsWhereCondition: FindManyOptions<SharedCredentials> & { where: ObjectLiteral } =
			{
				where: { user: In(workflowUserIds) },
			};

		if (!isSharingEnabled()) {
			// If credential sharing is not enabled, get only credentials owned by this user
			credentialsWhereCondition.where.role = await getRole('credential', 'owner');
		}

		const credentialSharings = await Db.collections.SharedCredentials.find(
			credentialsWhereCondition,
		);

		const accessibleCredIds = credentialSharings.map((s) => s.credentialId.toString());

		const inaccessibleCredIds = workflowCredIds.filter((id) => !accessibleCredIds.includes(id));

		if (inaccessibleCredIds.length === 0) return;

		// if disallowed, flag only first node using first inaccessible cred

		const nodeToFlag = credIdsToNodes[inaccessibleCredIds[0]][0];

		throw new NodeOperationError(nodeToFlag, 'Node has no access to credential', {
			description: 'Please recreate the credential or ask its owner to share it with you.',
		});
	}

	static async checkSubworkflowExecutePolicy(
		workflow: Workflow,
		userId: string,
		parentWorkflowId?: string,
	) {
		/**
		 * Important considerations: both the current workflow and the parent can have empty IDs.
		 * This happens when a user is executing an unsaved workflow manually running a workflow
		 * loaded from a file or code, for instance.
		 * This is an important topic to keep in mind for all security checks
		 */
		if (!workflow.id) {
			// It's a workflow from code and not loaded from DB
			// No checks are necessary since it doesn't have any sort of settings
			return;
		}

		const policy =
			workflow.settings?.callerPolicy ?? config.getEnv('workflows.callerPolicyDefaultOption');

		if (policy === 'none') {
			throw new SubworkflowOperationError(
				`Target workflow ID ${workflow.id ?? ''} may not be called by other workflows.`,
				'Please update the settings of the target workflow or ask its owner to do so.',
			);
		}

		if (policy === 'workflowsFromAList') {
			if (parentWorkflowId === undefined) {
				throw new SubworkflowOperationError(
					`Target workflow ID ${
						workflow.id ?? ''
					} may only be called by a list of workflows. The current workflow is not saved, therefore cannot be checked.`,
					'Please save the current workflow and try again.',
				);
			}
			const allowedCallerIds = (workflow.settings.callerIds as string | undefined)
				?.split(',')
				.map((id) => id.trim())
				.filter((id) => id !== '');

			if (!allowedCallerIds?.includes(parentWorkflowId)) {
				throw new SubworkflowOperationError(
					`Target workflow ID ${
						workflow.id ?? ''
					} may only be called by a list of workflows, which does not include current workflow ID ${parentWorkflowId}.`,
					'Please update the settings of the target workflow or ask its owner to do so.',
				);
			}
		}

		if (policy === 'workflowsFromSameOwner') {
			const user = await UserService.get({ id: userId });
			if (!user) {
				throw new WorkflowOperationError(
					'Fatal error: user not found. Please contact the system administrator.',
				);
			}
			const sharing = await WorkflowsService.getSharing(user, workflow.id, ['role']);
			if (!sharing || sharing.role.name !== 'owner') {
				throw new SubworkflowOperationError(
					`Target workflow ID ${
						workflow.id ?? ''
					} may only be called by workflows from the same owner. The current workflow is not shared with the owner of the target workflow.`,
					'Please share the current workflow with the owner of the target workflow and try again.',
				);
			}
		}
	}

	private static mapCredIdsToNodes(workflow: Workflow) {
		return Object.values(workflow.nodes).reduce<{ [credentialId: string]: INode[] }>(
			(map, node) => {
				if (node.disabled || !node.credentials) return map;

				Object.values(node.credentials).forEach((cred) => {
					if (!cred.id) {
						throw new NodeOperationError(node, 'Node uses invalid credential', {
							description: 'Please recreate the credential.',
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
