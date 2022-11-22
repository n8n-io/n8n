import { INode, NodeOperationError, Workflow } from 'n8n-workflow';
import { FindManyOptions, In, ObjectLiteral } from 'typeorm';
import * as Db from '@/Db';
import config from '@/config';
import type { SharedCredentials } from '@db/entities/SharedCredentials';
import { getRole } from './UserManagementHelper';

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

		if (workflow.id && config.getEnv('enterprise.workflowSharingEnabled')) {
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

		if (!config.getEnv('enterprise.features.sharing')) {
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
