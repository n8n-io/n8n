import { Service } from '@n8n/di';
import type { WorkflowSharingRole } from '@n8n/permissions';
import { DataSource, Repository, In, Not } from '@n8n/typeorm';
import type { EntityManager, FindManyOptions, FindOptionsWhere } from '@n8n/typeorm';

import type { Project } from '../entities';
import { SharedWorkflow } from '../entities';

@Service()
export class SharedWorkflowRepository extends Repository<SharedWorkflow> {
	constructor(dataSource: DataSource) {
		super(SharedWorkflow, dataSource.manager);
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

	async makeOwner(workflowIds: string[], projectId: string, trx?: EntityManager) {
		trx = trx ?? this.manager;

		return await trx.upsert(
			SharedWorkflow,
			workflowIds.map(
				(workflowId) =>
					({
						workflowId,
						projectId,
						role: 'workflow:owner',
					}) as const,
			),

			['projectId', 'workflowId'],
		);
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

	async deleteByIds(sharedWorkflowIds: string[], projectId: string, trx?: EntityManager) {
		trx = trx ?? this.manager;

		return await trx.delete(SharedWorkflow, {
			projectId,
			workflowId: In(sharedWorkflowIds),
		});
	}

	/**
	 * Find the IDs of all the projects where a workflow is accessible.
	 */
	async findProjectIds(workflowId: string) {
		const rows = await this.find({ where: { workflowId }, select: ['projectId'] });

		const projectIds = rows.reduce<string[]>((acc, row) => {
			if (row.projectId) acc.push(row.projectId);
			return acc;
		}, []);

		return [...new Set(projectIds)];
	}

	async getWorkflowOwningProject(workflowId: string) {
		return (
			await this.findOne({
				where: { workflowId, role: 'workflow:owner' },
				relations: { project: true },
			})
		)?.project;
	}

	async getRelationsByWorkflowIdsAndProjectIds(workflowIds: string[], projectIds: string[]) {
		return await this.find({
			where: {
				workflowId: In(workflowIds),
				projectId: In(projectIds),
			},
		});
	}

	async getAllRelationsForWorkflows(workflowIds: string[]) {
		return await this.find({
			where: {
				workflowId: In(workflowIds),
			},
			relations: ['project'],
		});
	}

	async findWorkflowWithOptions(
		workflowId: string,
		options: {
			where?: FindOptionsWhere<SharedWorkflow>;
			includeTags?: boolean;
			includeParentFolder?: boolean;
			em?: EntityManager;
		} = {},
	) {
		const {
			where = {},
			includeTags = false,
			includeParentFolder = false,
			em = this.manager,
		} = options;

		return await em.findOne(SharedWorkflow, {
			where: {
				workflowId,
				...where,
			},
			relations: {
				workflow: {
					shared: { project: { projectRelations: { user: true } } },
					tags: includeTags,
					parentFolder: includeParentFolder,
				},
			},
		});
	}
}
