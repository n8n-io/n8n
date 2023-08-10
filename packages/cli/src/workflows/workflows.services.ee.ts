import type {
	DeleteResult,
	EntityManager,
	FindManyOptions,
	FindOptionsSelect,
	FindOptionsWhere,
} from 'typeorm';
import { In, Like, Not } from 'typeorm';
import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import type { ICredentialsDb } from '@/Interfaces';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import type { User } from '@db/entities/User';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { UserService } from '@/user/user.service';
import { WorkflowsService } from './workflows.services';
import type {
	CredentialUsedByWorkflow,
	WorkflowWithSharingsAndCredentials,
} from './workflows.types';
import { EECredentialsService as EECredentials } from '@/credentials/credentials.service.ee';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';
import { NodeOperationError } from 'n8n-workflow';
import { RoleService } from '@/services/role.service';
import Container from 'typedi';
import { WorkflowRepository } from '@/databases/repositories';
import config from '@/config';
import { OwnershipService } from '@/services/ownership.service';
import type { ListQuery } from '@/requests';

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
		const users = await UserService.getByIds(transaction, shareWithIds);
		const role = await Container.get(RoleService).findWorkflowEditorRole();

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

	static async getMany(user: User, options?: ListQuery.Options) {
		const sharedWorkflowIds = await getSharedWorkflowIds(user);

		if (sharedWorkflowIds.length === 0) return { workflows: [], count: 0 };

		const where: FindOptionsWhere<WorkflowEntity> = {
			...options?.filter,
			id: In(sharedWorkflowIds),
		};

		if (typeof where.name === 'string' && where.name !== '') {
			where.name = Like(`%${where.name}%`);
		}

		type Select = FindOptionsSelect<WorkflowEntity> & { ownedBy?: true };

		const select: Select = options?.select
			? { ...options.select } // copy to enable field removal without affecting original
			: {
					name: true,
					active: true,
					createdAt: true,
					updatedAt: true,
					versionId: true,
					shared: { userId: true, roleId: true },
			  };

		delete select?.ownedBy; // remove non-entity field, handled after query

		const areTagsEnabled = !config.getEnv('workflowTagsDisabled');
		const isDefaultSelect = options?.select === undefined;
		const areTagsRequested = isDefaultSelect || options?.select?.tags === true;

		const relations: string[] = [];

		if (areTagsEnabled && areTagsRequested) {
			relations.push('tags');
			select.tags = { id: true, name: true };
		}

		if (isDefaultSelect || options?.select?.ownedBy === true) {
			relations.push('shared');
		}

		const findManyOptions: FindManyOptions<WorkflowEntity> = {
			select: { ...select, id: true },
			where,
		};

		if (isDefaultSelect || options?.select?.updatedAt === true) {
			findManyOptions.order = { updatedAt: 'ASC' };
		}

		if (relations.length > 0) {
			findManyOptions.relations = relations;
		}

		if (options?.take) {
			findManyOptions.skip = options.skip;
			findManyOptions.take = options.take;
		}

		const [workflows, count] = (await Container.get(WorkflowRepository).findAndCount(
			findManyOptions,
		)) as [ListQuery.Workflow.WithSharing[], number];

		const role = await Container.get(RoleService).findWorkflowOwnerRole();
		const ownershipService = Container.get(OwnershipService);

		return {
			workflows: workflows.map((w) => ownershipService.addOwnedBy(w, role)),
			count,
		};
	}
}
