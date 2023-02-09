import type { DeleteResult, EntityManager } from 'typeorm';
import { In, Not } from 'typeorm';
import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import type { ICredentialsDb } from '@/Interfaces';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import type { User } from '@db/entities/User';
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
		const workflow = await transaction.findOne(WorkflowEntity, {
			where: { id: workflowId },
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
			workflowId,
			userId: Not(In(userIds)),
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
			const entity: Partial<SharedWorkflow> = {
				workflowId: workflow.id,
				userId: user.id,
				roleId: role?.id,
			};
			acc.push(Db.collections.SharedWorkflow.create(entity));
			return acc;
		}, []);

		return transaction.save(newSharedWorkflows);
	}

	static addOwnerAndSharings(workflow: WorkflowWithSharingsAndCredentials): void {
		workflow.ownedBy = null;
		workflow.sharedWith = [];
		if (!workflow.usedCredentials) {
			workflow.usedCredentials = [];
		}

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
		const credentialIdsUsedByWorkflow = new Set<string>();
		workflow.nodes.forEach((node) => {
			if (!node.credentials) {
				return;
			}
			Object.keys(node.credentials).forEach((credentialType) => {
				const credential = node.credentials?.[credentialType];
				if (!credential?.id) {
					return;
				}
				credentialIdsUsedByWorkflow.add(credential.id);
			});
		});
		const workflowCredentials = await EECredentials.getMany({
			where: {
				id: In(Array.from(credentialIdsUsedByWorkflow)),
			},
			relations: ['shared', 'shared.user', 'shared.role'],
		});
		const userCredentialIds = userCredentials.map((credential) => credential.id);
		workflowCredentials.forEach((credential) => {
			const credentialId = credential.id;
			const workflowCredential: CredentialUsedByWorkflow = {
				id: credentialId,
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

	static async addCredentialsToWorkflows(
		workflows: WorkflowWithSharingsAndCredentials[],
		currentUser: User,
	): Promise<void> {
		// Create 2 maps: one with all the credential ids used by all workflows
		// And another to match back workflow <> credentials
		const allUsedCredentialIds = new Set<string>();
		const mapsWorkflowsToUsedCredentials: string[][] = [];
		workflows.forEach((workflow, idx) => {
			workflow.nodes.forEach((node) => {
				if (!node.credentials) {
					return;
				}
				Object.keys(node.credentials).forEach((credentialType) => {
					const credential = node.credentials?.[credentialType];
					if (!credential?.id) {
						return;
					}
					if (!mapsWorkflowsToUsedCredentials[idx]) {
						mapsWorkflowsToUsedCredentials[idx] = [];
					}
					mapsWorkflowsToUsedCredentials[idx].push(credential.id);
					allUsedCredentialIds.add(credential.id);
				});
			});
		});

		const usedWorkflowsCredentials = await EECredentials.getMany({
			where: {
				id: In(Array.from(allUsedCredentialIds)),
			},
			relations: ['shared', 'shared.user', 'shared.role'],
		});
		const userCredentials = await EECredentials.getAll(currentUser, { disableGlobalRole: true });
		const userCredentialIds = userCredentials.map((credential) => credential.id);
		const credentialsMap: Record<string, CredentialUsedByWorkflow> = {};
		usedWorkflowsCredentials.forEach((credential) => {
			const credentialId = credential.id;
			credentialsMap[credentialId] = {
				id: credentialId,
				name: credential.name,
				type: credential.type,
				currentUserHasAccess: userCredentialIds.includes(credentialId),
				sharedWith: [],
				ownedBy: null,
			};
			credential.shared?.forEach(({ user, role }) => {
				const { id, email, firstName, lastName } = user;
				if (role.name === 'owner') {
					credentialsMap[credentialId].ownedBy = { id, email, firstName, lastName };
				} else {
					credentialsMap[credentialId].sharedWith?.push({
						id,
						email,
						firstName,
						lastName,
					});
				}
			});
		});

		mapsWorkflowsToUsedCredentials.forEach((usedCredentialIds, idx) => {
			workflows[idx].usedCredentials = usedCredentialIds.map((id) => credentialsMap[id]);
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
				const credentialId = node.credentials?.[credentialType].id;
				if (credentialId === undefined) return;
				const matchedCredential = allowedCredentials.find(({ id }) => id === credentialId);
				if (!matchedCredential) {
					throw new Error('The workflow contains credentials that you do not have access to');
				}
			});
		});
	}

	static async preventTampering(workflow: WorkflowEntity, workflowId: string, user: User) {
		const previousVersion = await EEWorkflowsService.get({ id: workflowId });

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
