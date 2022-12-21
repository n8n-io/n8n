import { DeleteResult, EntityManager, In, Not } from 'typeorm';
import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import { ICredentialsDb } from '@/Interfaces';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { User } from '@db/entities/User';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { RoleService } from '@/role/role.service';
import { UserService } from '@/user/user.service';
import { WorkflowsService } from './workflows.services';
import type {
	CredentialUsedByWorkflow,
	WorkflowWithSharingsAndCredentials,
} from './workflows.types';
import { EECredentialsService as EECredentials } from '@/credentials/credentials.service.ee';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';
import { NodeOperationError } from 'n8n-workflow';

export class EEWorkflowsService extends WorkflowsService {
	static async getWorkflowIdsForUser(user: User) {
		// Get all workflows regardless of role
		return getSharedWorkflowIds(user);
	}

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

	static addOwnerAndSharings(workflow: WorkflowWithSharingsAndCredentials): void {
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
	}

	static async addCredentialsToWorkflow(
		workflow: WorkflowWithSharingsAndCredentials,
		currentUser: User,
	): Promise<void> {
		workflow.usedCredentials = [];
		const userCredentials = await EECredentials.getAll(currentUser, { disableGlobalRole: true });
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
			relations: ['shared', 'shared.user', 'shared.role'],
		});
		const userCredentialIds = userCredentials.map((credential) => credential.id.toString());
		workflowCredentials.forEach((credential) => {
			const credentialId = credential.id.toString();
			const workflowCredential: CredentialUsedByWorkflow = {
				id: credential.id.toString(),
				name: credential.name,
				type: credential.type,
				currentUserHasAccess: userCredentialIds.includes(credentialId),
				sharedWith: [],
				ownedBy: null,
			};
			credential.shared?.forEach(({ user, role }) => {
				const { id, email, firstName, lastName } = user;
				if (role.name === 'owner') {
					workflowCredential.ownedBy = { id, email, firstName, lastName };
				} else {
					workflowCredential.sharedWith?.push({ id, email, firstName, lastName });
				}
			});
			workflow.usedCredentials?.push(workflowCredential);
		});
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

	static async preventTampering(workflow: WorkflowEntity, workflowId: string, user: User) {
		const previousVersion = await EEWorkflowsService.get({ id: parseInt(workflowId, 10) });

		if (!previousVersion) {
			throw new ResponseHelper.NotFoundError('Workflow not found');
		}

		const allCredentials = await EECredentials.getAll(user);

		try {
			return WorkflowHelpers.validateWorkflowCredentialUsage(
				workflow,
				previousVersion,
				allCredentials,
			);
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw new ResponseHelper.BadRequestError(error.message);
			}
			throw new ResponseHelper.BadRequestError(
				'Invalid workflow credentials - make sure you have access to all credentials and try again.',
			);
		}
	}
}
