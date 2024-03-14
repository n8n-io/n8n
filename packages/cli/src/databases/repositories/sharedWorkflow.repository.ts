import { Service } from 'typedi';
import { DataSource, Repository, In, Not } from '@n8n/typeorm';
import type { EntityManager, FindManyOptions, FindOptionsWhere } from '@n8n/typeorm';
import { SharedWorkflow, type WorkflowSharingRole } from '../entities/SharedWorkflow';
import { type User } from '../entities/User';
import type { Scope } from '@n8n/permissions';
import { RoleService } from '@/services/role.service';
import type { Project } from '../entities/Project';

@Service()
export class SharedWorkflowRepository extends Repository<SharedWorkflow> {
	constructor(
		dataSource: DataSource,
		private roleService: RoleService,
	) {
		super(SharedWorkflow, dataSource.manager);
	}

	/** Get the IDs of all users this workflow is shared with */
	async getSharedUserIds(workflowId: string) {
		const sharedWorkflows = await this.find({
			where: { workflowId },
			relations: { project: { projectRelations: true } },
		});

		return sharedWorkflows.flatMap((sharing) =>
			sharing.project.projectRelations.map((pr) => pr.userId),
		);
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
			where: {
				role: 'workflow:owner',
				workflowId: In(workflowIds),
			},
			relations: { project: { projectRelations: { user: true } } },
		});
	}

	async findSharingRole(
		userId: string,
		workflowId: string,
	): Promise<WorkflowSharingRole | undefined> {
		const sharing = await this.findOne({
			// NOTE: We have to select everything that is used in the `where` clause. Otherwise typeorm will create an invalid query and we get this error:
			//       QueryFailedError: SQLITE_ERROR: no such column: distinctAlias.SharedWorkflow_...
			select: {
				role: true,
				workflowId: true,
				projectId: true,
			},
			where: {
				workflowId,
				project: { projectRelations: { role: 'project:personalOwner', userId } },
			},
		});

		return sharing?.role;
	}

	async makeOwnerOfAllWorkflows(project: Project) {
		return await this.update(
			{
				projectId: Not(project.id),
				role: 'workflow:owner',
			},
			{ project },
		);
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

	async deleteByIds(transaction: EntityManager, sharedWorkflowIds: string[], project?: Project) {
		return await transaction.delete(SharedWorkflow, {
			project,
			workflowId: In(sharedWorkflowIds),
		});
	}

	async findWorkflowForUser(
		workflowId: string,
		user: User,
		scopes: Scope[],
		{ includeTags = false } = {},
	) {
		let where: FindOptionsWhere<SharedWorkflow> = { workflowId };

		if (!user.hasGlobalScope(scopes, { mode: 'allOf' })) {
			const projectRoles = this.roleService.rolesWithScope('project', scopes);
			const workflowRoles = this.roleService.rolesWithScope('workflow', scopes);

			where = {
				...where,
				role: In(workflowRoles),
				project: {
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		}

		const sharedWorkflow = await this.findOne({
			where,
			relations: {
				workflow: {
					shared: { project: { projectRelations: { user: true } } },
					tags: includeTags,
				},
			},
		});

		if (!sharedWorkflow) {
			return null;
		}

		return sharedWorkflow.workflow;
	}

	async findAllWorkflowsForUser(user: User, scopes: Scope[]) {
		let where: FindOptionsWhere<SharedWorkflow> = {};

		if (!user.hasGlobalScope(scopes, { mode: 'allOf' })) {
			const projectRoles = this.roleService.rolesWithScope('project', scopes);
			const workflowRoles = this.roleService.rolesWithScope('workflow', scopes);

			where = {
				...where,
				role: In(workflowRoles),
				project: {
					projectRelations: {
						role: In(projectRoles),
						userId: user.id,
					},
				},
			};
		}

		const sharedWorkflows = await this.find({
			where,
			relations: {
				workflow: {
					shared: { project: { projectRelations: { user: true } } },
				},
			},
		});

		return sharedWorkflows.map((sw) => sw.workflow);
	}
}
