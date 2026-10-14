import type { CreateAppDto, ListAppsQueryDto, UpdateAppDto } from '@n8n/api-types';
import {
	escapeLike,
	isUniqueConstraintError,
	LIKE_ESCAPE_CLAUSE,
	parseListQuerySortBy,
	Project,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource, In, Raw, Repository, type FindOptionsWhere } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { App } from './app.entity';

@Service()
export class AppRepository extends Repository<App> {
	constructor(dataSource: DataSource) {
		super(App, dataSource.manager);
	}

	async projectExists(projectId: string) {
		return await this.manager.existsBy(Project, { id: projectId });
	}

	async createApp(projectId: string, dto: CreateAppDto): Promise<App> {
		try {
			return await this.save({
				...dto,
				id: randomUUID(),
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

	async updateApp(projectId: string, appId: string, dto: UpdateAppDto) {
		const where = { id: appId, projectId };
		try {
			const result = await this.update(where, dto);
			if (!result.affected) return null;

			return await this.findOneBy(where);
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('An app already uses this namespace. Choose another namespace.');
			}
			throw error;
		}
	}
}
