import type { CreateAppDto, ListAppsQueryDto, UpdateAppDto } from '@n8n/api-types';
import {
	BaseRepository,
	escapeLike,
	isUniqueConstraintError,
	LIKE_ESCAPE_CLAUSE,
	parseListQuerySortBy,
	Project,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource, In, IsNull, Raw, type FindOptionsWhere } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import { App } from './app.entity';

@Service()
export class AppRepository extends BaseRepository<App> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(App, dataSource.manager, transactionRunner);
	}

	async findInProject(projectId: string, appId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOneBy(App, { id: appId, projectId });
	}

	async findById(appId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOneBy(App, { id: appId });
	}

	async findByNamespace(namespace: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOneBy(App, { namespace });
	}

	async setPublishedVersion(
		projectId: string,
		appId: string,
		versionId: string | null,
		ctx: OperationContext,
	) {
		await this.managerFor(ctx).update(
			App,
			{ id: appId, projectId },
			{ publishedVersionId: versionId },
		);
		return await this.findInProject(projectId, appId, ctx);
	}

	async advanceDraft(
		appId: string,
		expectedVersionId: string | null,
		versionId: string,
		ctx: OperationContext,
	) {
		const result = await this.managerFor(ctx).update(
			App,
			{
				id: appId,
				draftVersionId: expectedVersionId ?? IsNull(),
			},
			{ draftVersionId: versionId },
		);
		return result.affected === 1;
	}

	async listIdsAfter(after: string | undefined, ctx: OperationContext = {}): Promise<string[]> {
		const query = this.managerFor(ctx)
			.createQueryBuilder(App, 'app')
			.select(['app.id'])
			.orderBy('app.id', 'ASC')
			.take(100);
		if (after) query.where('app.id > :after', { after });
		return (await query.getMany()).map((app) => app.id);
	}

	async deleteInProject(projectId: string, appId: string, ctx: OperationContext): Promise<boolean> {
		const result = await this.managerFor(ctx).delete(App, { id: appId, projectId });
		return result.affected === 1;
	}

	async projectExists(projectId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).existsBy(Project, { id: projectId });
	}

	async createApp(
		projectId: string,
		dto: CreateAppDto & { id?: string },
		ctx: OperationContext = {},
	): Promise<App> {
		try {
			const manager = this.managerFor(ctx);
			const app = manager.create(App, {
				...dto,
				id: dto.id ?? uuidv7(),
				projectId,
				draftVersionId: null,
				publishedVersionId: null,
			});
			await manager.insert(App, app);
			return app;
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('An app already uses this namespace. Choose another namespace.');
			}
			throw error;
		}
	}

	async list(
		projectIds: string[] | null,
		{ skip, take, name, sortBy }: ListAppsQueryDto,
		ctx: OperationContext = {},
	) {
		if (projectIds?.length === 0) return { data: [], count: 0 };

		const where: FindOptionsWhere<App> = {};
		if (projectIds !== null) where.projectId = In(projectIds);
		if (name) {
			where.name = Raw((alias) => `LOWER(${alias}) LIKE LOWER(:name) ${LIKE_ESCAPE_CLAUSE}`, {
				name: `%${escapeLike(name)}%`,
			});
		}
		const { column, direction } = parseListQuerySortBy(sortBy);
		const manager = this.managerFor(ctx);
		if (take === 0) return { data: [], count: await manager.countBy(App, where) };

		const [data, count] = await manager.findAndCount(App, {
			where,
			order: { [column]: direction, id: 'ASC' },
			skip,
			take,
		});
		return { data, count };
	}

	async updateApp(projectId: string, appId: string, dto: UpdateAppDto, ctx: OperationContext = {}) {
		const where = { id: appId, projectId };
		try {
			return await this.runInTransaction(ctx, async (manager) => {
				const result = await manager.update(App, where, dto);
				if (!result.affected) return null;

				return await manager.findOneBy(App, where);
			});
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('An app already uses this namespace. Choose another namespace.');
			}
			throw error;
		}
	}
}
