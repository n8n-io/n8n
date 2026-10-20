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
import { DataSource, In, Raw, type FindOptionsWhere } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import { App } from './app.entity';

@Service()
export class AppRepository extends BaseRepository<App> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(App, dataSource.manager, transactionRunner);
	}

	async projectExists(projectId: string) {
		return await this.manager.existsBy(Project, { id: projectId });
	}

	async createApp(projectId: string, dto: CreateAppDto): Promise<App> {
		try {
			return await this.save({
				...dto,
				id: uuidv7(),
				projectId,
				draftVersionId: null,
				publishedVersionId: null,
			});
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('An app already uses this namespace. Choose another namespace.');
			}
			throw error;
		}
	}

	async list(projectIds: string[] | null, { skip, take, name, sortBy }: ListAppsQueryDto) {
		if (projectIds?.length === 0) return { data: [], count: 0 };

		const where: FindOptionsWhere<App> = {};
		if (projectIds !== null) where.projectId = In(projectIds);
		if (name) {
			where.name = Raw((alias) => `LOWER(${alias}) LIKE LOWER(:name) ${LIKE_ESCAPE_CLAUSE}`, {
				name: `%${escapeLike(name)}%`,
			});
		}
		const { column, direction } = parseListQuerySortBy(sortBy);
		if (take === 0) return { data: [], count: await this.countBy(where) };

		const [data, count] = await this.findAndCount({
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
