import type { DocPageProperties, DocPageResourceType } from '@n8n/api-types';
import {
	BaseRepository,
	escapeLike,
	LIKE_ESCAPE_CLAUSE,
	OperationContext,
	SharedWorkflow,
	TransactionRunner,
	WorkflowEntity,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not } from '@n8n/typeorm';
import type { INode } from 'n8n-workflow';

import { Agent } from '@/modules/agents/entities/agent.entity';

import { DocPageEntity } from './doc-page.entity';

class DocPageTable extends BaseRepository<DocPageEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(DocPageEntity, dataSource.manager, transactionRunner);
	}
}

export type AgentHead = {
	id: string;
	name: string;
	projectId: string;
	activeVersionId: string | null;
};

export type PublishedWorkflow = {
	id: string;
	name: string;
	activeVersionId: string;
	nodes: INode[];
};

export type NewDocPageRow = Pick<
	DocPageEntity,
	| 'projectId'
	| 'parentId'
	| 'resourceType'
	| 'resourceId'
	| 'kind'
	| 'title'
	| 'content'
	| 'markdown'
	| 'contentText'
	| 'properties'
	| 'writtenAgainstVersionId'
	| 'updatedById'
>;

// Ancestor walks stop here, so a broken parent chain cannot loop forever.
const MAX_DEPTH = 50;

@Service()
export class DocPageRepository {
	private readonly table: DocPageTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new DocPageTable(dataSource, transactionRunner);
	}

	async findById(id: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).findOneBy(DocPageEntity, { id });
	}

	async findByResource(
		resourceType: DocPageResourceType,
		resourceId: string,
		ctx: OperationContext = {},
	) {
		return await this.table.managerFor(ctx).findOneBy(DocPageEntity, { resourceType, resourceId });
	}

	/** Root pages of the given projects. */
	async listByProjects(projectIds: string[], ctx: OperationContext = {}) {
		if (projectIds.length === 0) return [];
		return await this.table.managerFor(ctx).findBy(DocPageEntity, {
			projectId: In(projectIds),
			parentId: IsNull(),
		});
	}

	async listByProject(projectId: string, ctx: OperationContext = {}) {
		return await this.listByProjects([projectId], ctx);
	}

	/** Root pages whose title or text contains `query`, newest first. */
	async search(query: string, limit: number, ctx: OperationContext = {}) {
		const pattern = `%${escapeLike(query.toLowerCase())}%`;
		return await this.table
			.managerFor(ctx)
			.createQueryBuilder(DocPageEntity, 'page')
			.where('page.parentId IS NULL')
			.andWhere(
				`(LOWER(page.title) LIKE :pattern ${LIKE_ESCAPE_CLAUSE} OR LOWER(page.contentText) LIKE :pattern ${LIKE_ESCAPE_CLAUSE})`,
				{ pattern },
			)
			.orderBy('page.updatedAt', 'DESC')
			.take(limit)
			.getMany();
	}

	async findChildren(parentId: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).find(DocPageEntity, {
			where: { parentId },
			select: { id: true, title: true },
			order: { createdAt: 'ASC' },
		});
	}

	/** Ancestors of the page, root first. The page itself is not in the list. */
	async findAncestors(page: Pick<DocPageEntity, 'parentId'>, ctx: OperationContext = {}) {
		const ancestors: DocPageEntity[] = [];
		let parentId = page.parentId;
		while (parentId && ancestors.length < MAX_DEPTH) {
			const parent = await this.findById(parentId, ctx);
			if (!parent) break;
			ancestors.unshift(parent);
			parentId = parent.parentId;
		}
		return ancestors;
	}

	/** `save`, not `insert`: the `@BeforeInsert` id generator only runs on an entity instance. */
	async insert(row: NewDocPageRow, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).save(DocPageEntity, this.table.create(row));
	}

	async save(page: DocPageEntity, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).save(DocPageEntity, page);
	}

	async updatePropertiesByResource(
		resourceType: DocPageResourceType,
		resourceId: string,
		properties: DocPageProperties | null,
		ctx: OperationContext = {},
	) {
		await this.table
			.managerFor(ctx)
			.update(DocPageEntity, { resourceType, resourceId }, { properties });
	}

	async deleteById(id: string, ctx: OperationContext = {}) {
		await this.table.managerFor(ctx).delete(DocPageEntity, { id });
	}

	/** The FK cascade removes the child pages. */
	async deleteByResource(
		resourceType: DocPageResourceType,
		resourceId: string,
		ctx: OperationContext = {},
	) {
		await this.table.managerFor(ctx).delete(DocPageEntity, { resourceType, resourceId });
	}

	/** Published, unarchived workflows that the project owns, with the nodes of the published version. */
	async findPublishedWorkflowsInProject(
		projectId: string,
		ctx: OperationContext = {},
	): Promise<PublishedWorkflow[]> {
		const workflows = await this.table
			.managerFor(ctx)
			.createQueryBuilder(WorkflowEntity, 'workflow')
			.innerJoin(
				SharedWorkflow,
				'shared',
				'shared.workflowId = workflow.id AND shared.projectId = :projectId AND shared.role = :role',
				{ projectId, role: 'workflow:owner' },
			)
			.innerJoin('workflow.activeVersion', 'activeVersion')
			.select(['workflow.id', 'workflow.name', 'workflow.activeVersionId'])
			.addSelect(['activeVersion.versionId', 'activeVersion.nodes'])
			.where('workflow.isArchived = :archived', { archived: false })
			.getMany();

		return workflows.flatMap((workflow) =>
			workflow.activeVersionId && workflow.activeVersion
				? [
						{
							id: workflow.id,
							name: workflow.name,
							activeVersionId: workflow.activeVersionId,
							nodes: workflow.activeVersion.nodes,
						},
					]
				: [],
		);
	}

	async findAgentHeads(
		where: { ids: string[] } | { projectId: string },
		ctx: OperationContext = {},
	): Promise<AgentHead[]> {
		if ('ids' in where && where.ids.length === 0) return [];
		const agents = await this.table.managerFor(ctx).find(Agent, {
			select: ['id', 'name', 'projectId', 'activeVersionId'],
			where: {
				scope: 'project',
				projectId: 'ids' in where ? Not(IsNull()) : where.projectId,
				...('ids' in where ? { id: In(where.ids) } : {}),
			},
		});
		return agents.flatMap((agent) =>
			agent.projectId ? [{ ...agent, projectId: agent.projectId }] : [],
		);
	}
}
