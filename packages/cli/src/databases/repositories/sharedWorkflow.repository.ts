import { Service } from 'typedi';
import { DataSource, Repository, In, Not } from '@n8n/typeorm';
import type { EntityManager, FindManyOptions, FindOptionsWhere } from '@n8n/typeorm';
import { SharedWorkflow, type WorkflowSharingRole } from '../entities/SharedWorkflow';
import { type User } from '../entities/User';
import type { Scope } from '@n8n/permissions';
import type { WorkflowEntity } from '../entities/WorkflowEntity';
import { ProjectRepository } from './project.repository';

@Service()
export class SharedWorkflowRepository extends Repository<SharedWorkflow> {
	constructor(
		dataSource: DataSource,
		private readonly projectRepository: ProjectRepository,
	) {
		super(SharedWorkflow, dataSource.manager);
	}

	async hasAccess(workflowId: string, user: User) {
		const where: FindOptionsWhere<SharedWorkflow> = {
			workflowId,
		};
		if (!user.hasGlobalScope('workflow:read')) {
			where.userId = user.id;
		}
		return await this.exist({ where });
	}

	/** Get the IDs of all users this workflow is shared with */
	async getSharedUserIds(workflowId: string) {
		const sharedWorkflows = await this.find({
			select: ['userId'],
			where: { workflowId },
		});
		return sharedWorkflows.map((sharing) => sharing.userId);
	}

	async getSharedWorkflowIds(workflowIds: string[]) {
		const sharedWorkflows = await this.find({
			select: ['workflowId'],
			where: {
				workflowId: In(workflowIds),
			},
		});
		return sharedWorkflows.map((sharing) => sharing.workflowId);
	}

	async findByWorkflowIds(workflowIds: string[]) {
		return await this.find({
			relations: ['user'],
			where: {
				role: 'workflow:owner',
				workflowId: In(workflowIds),
			},
		});
	}

	async findSharingRole(
		userId: string,
		workflowId: string,
	): Promise<WorkflowSharingRole | undefined> {
		return await this.findOne({
			select: ['role'],
			where: { workflowId, userId },
		}).then((shared) => shared?.role);
	}

	async findSharing(
		workflowId: string,
		user: User,
		scope: Scope,
		{ roles, extraRelations }: { roles?: WorkflowSharingRole[]; extraRelations?: string[] } = {},
	) {
		const where: FindOptionsWhere<SharedWorkflow> = {
			workflow: { id: workflowId },
		};

		if (!user.hasGlobalScope(scope)) {
			where.user = { id: user.id };
		}

		if (roles) {
			where.role = In(roles);
		}

		const relations = ['workflow'];

		if (extraRelations) relations.push(...extraRelations);

		return await this.findOne({ relations, where });
	}

	async makeOwnerOfAllWorkflows(user: User) {
		const project = await this.projectRepository.getPersonalProjectForUserOrFail(user.id);
		return await this.update(
			{ projectId: Not(project.id), role: 'workflow:owner' },
			{
				projectId: project.id,
				// TODO: Remove this in the future when the userId property is removed
				// from the SharedWorkflow.
				// Right now it has to stay here, otherwise the cascading deletes
				// started from the cli user management reset command will delete this
				// shared workflow too.
				// See: src/commands/user-management/reset.ts
				userId: user.id,
			},
		);
	}

	async getSharing(
		user: User,
		workflowId: string,
		options: { allowGlobalScope: true; globalScope: Scope } | { allowGlobalScope: false },
		relations: string[] = ['workflow'],
	): Promise<SharedWorkflow | null> {
		const where: FindOptionsWhere<SharedWorkflow> = { workflowId };

		// Omit user from where if the requesting user has relevant
		// global workflow permissions. This allows the user to
		// access workflows they don't own.
		if (!options.allowGlobalScope || !user.hasGlobalScope(options.globalScope)) {
			where.userId = user.id;
		}

		return await this.findOne({ where, relations });
	}

	async getSharedWorkflows(
		user: User,
		options: {
			relations?: string[];
			workflowIds?: string[];
		},
	): Promise<SharedWorkflow[]> {
		return await this.find({
			where: {
				...(!['global:owner', 'global:admin'].includes(user.role) && { userId: user.id }),
				...(options.workflowIds && { workflowId: In(options.workflowIds) }),
			},
			...(options.relations && { relations: options.relations }),
		});
	}

	async share(transaction: EntityManager, workflow: WorkflowEntity, users: User[]) {
		const newSharedWorkflows = [];

		for (const user of users) {
			if (user.isPending) {
				continue;
			}

			const project = await this.projectRepository.getPersonalProjectForUserOrFail(user.id);
			const entity: Partial<SharedWorkflow> = {
				workflowId: workflow.id,
				userId: user.id,
				projectId: project.id,
				role: 'workflow:editor',
			};
			newSharedWorkflows.push(this.create(entity));
		}

		return await transaction.save(newSharedWorkflows);
	}

	async findWithFields(
		workflowIds: string[],
		{ select }: Pick<FindManyOptions<SharedWorkflow>, 'select'>,
	) {
		return await this.find({
			where: {
				workflowId: In(workflowIds),
			},
			select,
		});
	}

	async deleteByIds(transaction: EntityManager, sharedWorkflowIds: string[], user?: User) {
		return await transaction.delete(SharedWorkflow, {
			user,
			workflowId: In(sharedWorkflowIds),
		});
	}
}
