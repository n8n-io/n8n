import { DeleteResult, EntityManager, In, Not } from 'typeorm';
import { Db, ICredentialsDb } from '..';
import { SharedWorkflow } from '../databases/entities/SharedWorkflow';
import { User } from '../databases/entities/User';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';
import { RoleService } from '../role/role.service';
import { UserService } from '../user/user.service';
import { WorkflowsService } from './workflows.services';
import { WorkflowWithSharings } from './workflows.types';

export class EEWorkflowsService extends WorkflowsService {
	static async isOwned(
		user: User,
		workflowId: string,
	): Promise<{ ownsWorkflow: boolean; workflow?: WorkflowEntity }> {
		const sharing = await this.getSharing(user, workflowId, ['workflow', 'role'], {
			allowGlobalOwner: false,
		});

		if (!sharing || sharing.role.name !== 'owner') return { ownsWorkflow: false };

		const { workflow } = sharing;

		return { ownsWorkflow: true, workflow };
	}

	static async getSharings(
		transaction: EntityManager,
		workflowId: string,
	): Promise<SharedWorkflow[]> {
		const workflow = await transaction.findOne(WorkflowEntity, workflowId, {
			relations: ['shared'],
		});
		return workflow?.shared ?? [];
	}

	static async pruneSharings(
		transaction: EntityManager,
		workflowId: string,
		userIds: string[],
	): Promise<DeleteResult> {
		return transaction.delete(SharedWorkflow, {
			workflow: { id: workflowId },
			user: { id: Not(In(userIds)) },
		});
	}

	static async share(
		transaction: EntityManager,
		workflow: WorkflowEntity,
		shareWithIds: string[],
	): Promise<SharedWorkflow[]> {
		const [users, role] = await Promise.all([
			UserService.getByIds(transaction, shareWithIds),
			RoleService.trxGet(transaction, { scope: 'workflow', name: 'editor' }),
		]);

		const newSharedWorkflows = users.reduce<SharedWorkflow[]>((acc, user) => {
			if (user.isPending) {
				return acc;
			}
			acc.push(
				Db.collections.SharedWorkflow.create({
					workflow,
					user,
					role,
				}),
			);
			return acc;
		}, []);

		return transaction.save(newSharedWorkflows);
	}

	static addOwnerAndSharings(
		workflow: WorkflowEntity & WorkflowWithSharings,
	): WorkflowEntity & WorkflowWithSharings {
		workflow.ownedBy = null;
		workflow.sharedWith = [];

		workflow.shared?.forEach(({ user, role }) => {
			const { id, email, firstName, lastName } = user;

			if (role.name === 'owner') {
				workflow.ownedBy = { id, email, firstName, lastName };
				return;
			}

			workflow.sharedWith?.push({ id, email, firstName, lastName });
		});

		// @ts-ignore
		delete workflow.shared;

		return workflow;
	}

	static validateCredentialPermissionsToUser(
		workflow: WorkflowEntity,
		allowedCredentials: ICredentialsDb[],
	) {
		workflow.nodes.forEach((node) => {
			if (!node.credentials) {
				return;
			}
			Object.keys(node.credentials).forEach((credentialType) => {
				const credentialId = parseInt(node.credentials?.[credentialType].id ?? '', 10);
				const matchedCredential = allowedCredentials.find(
					(credential) => credential.id === credentialId,
				);
				if (!matchedCredential) {
					throw new Error('The workflow contains credentials that you do not have access to');
				}
			});
		});
	}
}
