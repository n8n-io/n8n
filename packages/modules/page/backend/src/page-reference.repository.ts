import type { PageResourceType } from '@n8n/api-types';
import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, type FindOptionsWhere } from '@n8n/typeorm';

import { PageReferenceEntity } from './page-reference.entity';

class PageReferenceTable extends BaseRepository<PageReferenceEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PageReferenceEntity, dataSource.manager, transactionRunner);
	}
}

/** One link from a page to a node. */
export type PageNodeLinkRow = { pageId: string; nodeId: string };

/** One link from a page to a workflow, or to one node of that workflow, with facts about the page. */
export type PageWorkflowLinkRow = {
	pageId: string;
	workflowId: string;
	pageProjectId: string;
	pageUpdatedAt: Date;
};

export type PageReferenceRow = Pick<
	PageReferenceEntity,
	'resourceType' | 'resourceId' | 'parentResourceId'
>;

/** A node belongs to a workflow, so a search for a workflow also matches the references to its nodes. */
function toNodeOfWorkflowConditions(
	resourceType: PageResourceType,
	resourceId: string,
): Array<FindOptionsWhere<PageReferenceEntity>> {
	return resourceType === 'workflow'
		? [{ resourceType: 'node', parentResourceId: resourceId }]
		: [];
}

/** Reads a reference to a workflow or to a node that was loaded with its page. */
function toWorkflowLinkRow({
	pageId,
	resourceId,
	parentResourceId,
	page,
}: PageReferenceEntity): PageWorkflowLinkRow {
	return {
		pageId,
		workflowId: parentResourceId ?? resourceId,
		pageProjectId: page.projectId,
		pageUpdatedAt: page.updatedAt,
	};
}

/** Restricts a search to the pages of these projects. `null` means every project. */
function toPageProjectCondition(
	projectIds: string[] | null,
): FindOptionsWhere<PageReferenceEntity> {
	return projectIds ? { page: { projectId: In(projectIds) } } : {};
}

@Service()
export class PageReferenceRepository {
	private readonly table: PageReferenceTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new PageReferenceTable(dataSource, transactionRunner);
	}

	async listByPage(pageId: string, ctx: OperationContext): Promise<PageReferenceRow[]> {
		return await this.table.managerFor(ctx).find(PageReferenceEntity, {
			select: ['resourceType', 'resourceId', 'parentResourceId'],
			where: { pageId },
		});
	}

	/**
	 * Makes `references` the complete set of references of the page.
	 * Pass the context of a transaction, because the delete and the insert are two statements.
	 */
	async replaceReferences(
		pageId: string,
		references: PageReferenceRow[],
		ctx: OperationContext,
	): Promise<void> {
		const manager = this.table.managerFor(ctx);
		await manager.delete(PageReferenceEntity, { pageId });
		if (references.length > 0) {
			await manager.insert(
				PageReferenceEntity,
				references.map((reference) => ({ ...reference, pageId })),
			);
		}
	}

	/**
	 * Finds the ids of the pages that reference a resource.
	 * A page that references a node of a workflow also references that workflow.
	 */
	async findReferencingPageIds(
		resourceType: PageResourceType,
		resourceId: string,
		ctx: OperationContext,
	): Promise<string[]> {
		const rows = await this.table.managerFor(ctx).find(PageReferenceEntity, {
			select: ['pageId'],
			where: [
				{ resourceType, resourceId },
				...toNodeOfWorkflowConditions(resourceType, resourceId),
			],
		});
		return [...new Set(rows.map((row) => row.pageId))];
	}

	/** Lists the links from any page to the nodes of a workflow. */
	async listNodeLinksOfWorkflow(
		workflowId: string,
		ctx: OperationContext,
	): Promise<PageNodeLinkRow[]> {
		const rows = await this.table.managerFor(ctx).find(PageReferenceEntity, {
			select: ['pageId', 'resourceId'],
			where: { resourceType: 'node', parentResourceId: workflowId },
		});
		return rows.map(({ pageId, resourceId }) => ({ pageId, nodeId: resourceId }));
	}

	/**
	 * Lists the links from pages to workflows and to their nodes.
	 * A page gives one row for each workflow link and one row for each node link.
	 * `projectIds` restricts the result to the pages of these projects. `null` means every project.
	 */
	async listWorkflowLinks(
		projectIds: string[] | null,
		ctx: OperationContext,
	): Promise<PageWorkflowLinkRow[]> {
		const rows = await this.table.managerFor(ctx).find(PageReferenceEntity, {
			select: {
				pageId: true,
				resourceType: true,
				resourceId: true,
				parentResourceId: true,
				page: { id: true, projectId: true, updatedAt: true },
			},
			relations: { page: true },
			where: { resourceType: In(['workflow', 'node']), ...toPageProjectCondition(projectIds) },
		});
		return rows.map(toWorkflowLinkRow);
	}
}
