import { DeleteResult, EntityManager, In, Not } from 'typeorm';
import { Db, ICredentialsDb, ResponseHelper, WorkflowHelpers } from '..';
import { SharedWorkflow } from '../databases/entities/SharedWorkflow';
import { User } from '../databases/entities/User';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';
import { RoleService } from '../role/role.service';
import { UserService } from '../user/user.service';
import { WorkflowsService } from './workflows.services';
import type { WorkflowWithSharingsAndCredentials } from './workflows.types';
import { EECredentialsService as EECredentials } from '../credentials/credentials.service.ee';

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
		workflow: WorkflowWithSharingsAndCredentials,
	): WorkflowWithSharingsAndCredentials {
		workflow.ownedBy = null;
		workflow.sharedWith = [];
		workflow.usedCredentials = [];

		workflow.shared?.forEach(({ user, role }) => {
			const { id, email, firstName, lastName } = user;

			if (role.name === 'owner') {
				workflow.ownedBy = { id, email, firstName, lastName };
				return;
			}

			workflow.sharedWith?.push({ id, email, firstName, lastName });
		});

		delete workflow.shared;

		return workflow;
	}

	static async addCredentialsToWorkflow(
		workflow: WorkflowWithSharingsAndCredentials,
		currentUser: User,
	): Promise<WorkflowWithSharingsAndCredentials> {
		workflow.usedCredentials = [];
		const userCredentials = await EECredentials.getAll(currentUser);
		const credentialIdsUsedByWorkflow = new Set<number>();
		workflow.nodes.forEach((node) => {
			if (!node.credentials) {
				return;
			}
			Object.keys(node.credentials).forEach((credentialType) => {
				const credential = node.credentials?.[credentialType];
				if (!credential?.id) {
					return;
				}
				const credentialId = parseInt(credential.id, 10);
				credentialIdsUsedByWorkflow.add(credentialId);
			});
		});
		const workflowCredentials = await EECredentials.getMany({
			where: {
				id: In(Array.from(credentialIdsUsedByWorkflow)),
			},
		});
		const userCredentialIds = userCredentials.map((credential) => credential.id.toString());
		workflowCredentials.forEach((credential) => {
			const credentialId = credential.id.toString();
			workflow.usedCredentials?.push({
				id: credential.id.toString(),
				name: credential.name,
				type: credential.type,
				currentUserHasAccess: userCredentialIds.includes(credentialId),
			});
		});

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

	static async updateWorkflow(
		user: User,
		workflow: WorkflowEntity,
		workflowId: string,
		tags?: string[],
		forceSave?: boolean,
	): Promise<WorkflowEntity> {
		const previousVersion = await EEWorkflowsService.get({ id: parseInt(workflowId, 10) });
		if (!previousVersion) {
			throw new ResponseHelper.ResponseError('Workflow not found', undefined, 404);
		}
		const allCredentials = await EECredentials.getAll(user);
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
			workflow = WorkflowHelpers.validateWorkflowCredentialUsage(
				workflow,
				previousVersion,
				allCredentials,
			);
		} catch (error) {
			throw new ResponseHelper.ResponseError(
				'Invalid workflow credentials - make sure you have access to all credentials and try again.',
				undefined,
				400,
			);
		}

		return super.updateWorkflow(user, workflow, workflowId, tags, forceSave);
	}
}
