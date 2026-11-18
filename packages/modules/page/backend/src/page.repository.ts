import {
	BaseRepository,
	escapeLike,
	LIKE_ESCAPE_CLAUSE,
	OperationContext,
	TransactionRunner,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, Raw, type FindOptionsWhere } from '@n8n/typeorm';

import { PageEntity } from './page.entity';

class PageTable extends BaseRepository<PageEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(PageEntity, dataSource.manager, transactionRunner);
	}
}

export type NewPageRow = Pick<PageEntity, 'projectId' | 'title' | 'content' | 'createdById'>;

export type PageRowChanges = Partial<Pick<PageEntity, 'title' | 'content'>>;

/** A page row without its content. */
export type PageSummaryRow = Pick<
	PageEntity,
	'id' | 'projectId' | 'title' | 'version' | 'createdAt' | 'updatedAt'
>;

/** A page row without its content, with the name of its project. */
export type PageListRow = PageSummaryRow & { projectName: string };

const summaryColumns = [
	'id',
	'projectId',
	'title',
	'version',
	'createdAt',
	'updatedAt',
] as const satisfies ReadonlyArray<keyof PageSummaryRow>;

/** Keeps the titles that contain the text. The case does not count. No text keeps every title. */
function toTitleCondition(titleQuery: string | undefined): FindOptionsWhere<PageEntity> {
	return titleQuery
		? {
				title: Raw((column) => `LOWER(${column}) LIKE :titlePattern ${LIKE_ESCAPE_CLAUSE}`, {
					titlePattern: `%${escapeLike(titleQuery.toLowerCase())}%`,
				}),
			}
		: {};
}

/** Restricts a search to these projects. `null` means every project. */
function toProjectCondition(projectIds: string[] | null): FindOptionsWhere<PageEntity> {
	return projectIds ? { projectId: In(projectIds) } : {};
}

function toPageListRow({ project, ...page }: PageEntity): PageListRow {
	return { ...page, projectName: project.name };
}

@Service()
export class PageRepository {
	private readonly table: PageTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new PageTable(dataSource, transactionRunner);
	}

	/** `save`, not `insert`: the id generator runs only on an entity instance. */
	async insertPage(row: NewPageRow, ctx: OperationContext): Promise<PageEntity> {
		return await this.table.managerFor(ctx).save(PageEntity, this.table.create(row));
	}

	async findById(pageId: string, ctx: OperationContext): Promise<PageEntity | null> {
		return await this.table.managerFor(ctx).findOneBy(PageEntity, { id: pageId });
	}

	async findInProject(
		pageId: string,
		projectId: string,
		ctx: OperationContext,
	): Promise<PageEntity | null> {
		return await this.table.managerFor(ctx).findOneBy(PageEntity, { id: pageId, projectId });
	}

	/** Lists the pages of a project, the most recently updated first. */
	async listSummariesByProject(
		projectId: string,
		ctx: OperationContext,
	): Promise<PageSummaryRow[]> {
		return await this.table.managerFor(ctx).find(PageEntity, {
			select: [...summaryColumns],
			where: { projectId },
			order: { updatedAt: 'DESC' },
		});
	}

	/**
	 * Lists the given pages, the most recently updated first.
	 * `projectIds` restricts the result to these projects. `null` means every project.
	 */
	async listSummariesByIds(
		pageIds: string[],
		projectIds: string[] | null,
		ctx: OperationContext,
	): Promise<PageSummaryRow[]> {
		return await this.table.managerFor(ctx).find(PageEntity, {
			select: [...summaryColumns],
			where: { id: In(pageIds), ...toProjectCondition(projectIds) },
			order: { updatedAt: 'DESC' },
		});
	}

	/**
	 * Lists at most `limit` pages with the name of their project, the most recently updated first.
	 * `projectIds` restricts the result to these projects. `null` means every project.
	 * `titleQuery` keeps the titles that contain it. The case does not count.
	 */
	async listRecentWithProjectName(
		filter: { projectIds: string[] | null; titleQuery?: string; limit: number },
		ctx: OperationContext,
	): Promise<PageListRow[]> {
		const pages = await this.table.managerFor(ctx).find(PageEntity, {
			select: {
				...Object.fromEntries(summaryColumns.map((column) => [column, true])),
				project: { id: true, name: true },
			},
			relations: { project: true },
			where: { ...toProjectCondition(filter.projectIds), ...toTitleCondition(filter.titleQuery) },
			order: { updatedAt: 'DESC' },
			take: filter.limit,
		});
		return pages.map(toPageListRow);
	}

	/**
	 * Applies the changes and adds one to the version, only while the row still holds `baseVersion`.
	 * The version test and the write are one statement, so one of two concurrent savers loses.
	 * Returns `false` when the page is not in the project or holds another version.
	 */
	async saveNextVersion(
		pageId: string,
		projectId: string,
		baseVersion: number,
		changes: PageRowChanges,
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.table
			.managerFor(ctx)
			.update(
				PageEntity,
				{ id: pageId, projectId, version: baseVersion },
				{ ...changes, version: baseVersion + 1, updatedAt: new Date() },
			);
		return result.affected === 1;
	}

	/** Returns `false` when the page is not in the project. */
	async deleteInProject(
		pageId: string,
		projectId: string,
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.table.managerFor(ctx).delete(PageEntity, { id: pageId, projectId });
		return result.affected === 1;
	}
}
