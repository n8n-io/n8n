import { Service } from '@n8n/di';
import {
	hasGlobalScope,
	PROJECT_OWNER_ROLE_SLUG,
	type Scope,
	type WorkflowSharingRole,
} from '@n8n/permissions';
import { DataSource, Repository, In, Not } from '@n8n/typeorm';
import type {
	EntityManager,
	FindManyOptions,
	FindOptionsWhere,
	SelectQueryBuilder,
} from '@n8n/typeorm';

import type { User } from '../entities';
import { Project, ProjectRelation, SharedWorkflow } from '../entities';

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
			relations: { project: { projectRelations: { user: true, role: true } } },
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
				project: { projectRelations: { role: { slug: PROJECT_OWNER_ROLE_SLUG }, userId } },
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

	async getSharedPersonalWorkflowsCount(): Promise<number> {
		return await this.createQueryBuilder('sw')
			.innerJoin('sw.project', 'project')
			.where('sw.role = :role', { role: 'workflow:owner' })
			.andWhere('project.type = :type', { type: 'personal' })
			.andWhere((qb) => {
				const subQuery = qb
					.subQuery()
					.select('1')
					.from(SharedWorkflow, 'other')
					.where('other.workflowId = sw.workflowId')
					.andWhere('other.projectId != sw.projectId')
					.getQuery();
				return `EXISTS ${subQuery}`;
			})
			.getCount();
	}

	async findWorkflowWithOptions(
		workflowId: string,
		options: {
			where?: FindOptionsWhere<SharedWorkflow>;
			includeTags?: boolean;
			includeParentFolder?: boolean;
			includeActiveVersion?: boolean;
			em?: EntityManager;
		} = {},
	) {
		const {
			where = {},
			includeTags = false,
			includeParentFolder = false,
			includeActiveVersion = false,
			em = this.manager,
		} = options;

		return await em.findOne(SharedWorkflow, {
			where: {
				workflowId,
				...where,
			},
			relations: {
				workflow: {
					shared: { project: true },
					tags: includeTags,
					parentFolder: includeParentFolder,
					activeVersion: includeActiveVersion ? { workflowPublishHistory: true } : false,
				},
			},
		});
	}

	/**
	 * Build a subquery that returns workflow IDs based on sharing permissions.
	 * This replicates the logic from WorkflowSharingService but as a subquery.
	 */
	buildSharedWorkflowIdsSubquery(
		user: User,
		sharingOptions: {
			scopes?: Scope[];
			projectRoles?: string[];
			workflowRoles?: string[];
			isPersonalProject?: boolean;
			personalProjectOwnerId?: string;
			onlySharedWithMe?: boolean;
			projectId?: string;
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): SelectQueryBuilder<any> {
		const {
			projectRoles,
			workflowRoles,
			isPersonalProject,
			personalProjectOwnerId,
			onlySharedWithMe,
			projectId,
		} = sharingOptions;

		const subquery = this.manager
			.createQueryBuilder()
			.select('sw.workflowId')
			.from(SharedWorkflow, 'sw');

		// Handle different sharing scenarios
		// Check explicit filters first (isPersonalProject, onlySharedWithMe) before falling back to user's global permissions
		if (isPersonalProject) {
			// Personal project - get owned workflows using the project owner's ID (not the requesting user's)
			const ownerUserId = personalProjectOwnerId ?? user.id;
			subquery
				.innerJoin(Project, 'p', 'sw.projectId = p.id')
				.innerJoin(ProjectRelation, 'pr', 'pr.projectId = p.id')
				.where('sw.role = :ownerRole', { ownerRole: 'workflow:owner' })
				.andWhere('pr.userId = :subqueryUserId', { subqueryUserId: ownerUserId })
				.andWhere('pr.role = :projectOwnerRole', { projectOwnerRole: PROJECT_OWNER_ROLE_SLUG });
		} else if (onlySharedWithMe) {
			// Shared with me - workflows shared (as editor) to user's personal project
			subquery
				.innerJoin(Project, 'p', 'sw.projectId = p.id')
				.innerJoin(ProjectRelation, 'pr', 'pr.projectId = p.id')
				.where('sw.role = :editorRole', { editorRole: 'workflow:editor' })
				.andWhere('pr.userId = :subqueryUserId', { subqueryUserId: user.id })
				.andWhere('pr.role = :projectOwnerRole', { projectOwnerRole: PROJECT_OWNER_ROLE_SLUG });
		} else if (!hasGlobalScope(user, 'workflow:read')) {
			// Standard sharing based on roles (global-scope users need no additional filtering)
			if (!workflowRoles || !projectRoles) {
				throw new Error('workflowRoles and projectRoles are required when not using special cases');
			}

			subquery
				.innerJoin(Project, 'p', 'sw.projectId = p.id')
				.innerJoin(ProjectRelation, 'pr', 'pr.projectId = p.id')
				.where('sw.role IN (:...workflowRoles)', { workflowRoles })
				.andWhere('pr.userId = :subqueryUserId', { subqueryUserId: user.id })
				.andWhere('pr.role IN (:...projectRoles)', { projectRoles });
		}

		// Apply project filter across all branches (except onlySharedWithMe which is personal-project scoped)
		if (!onlySharedWithMe && projectId) {
			subquery.andWhere('sw.projectId = :subqueryProjectId', { subqueryProjectId: projectId });
		}

		return subquery;
	}
}
