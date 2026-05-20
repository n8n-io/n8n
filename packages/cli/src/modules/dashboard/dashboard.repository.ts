import type { CreateDashboardDto, ListDashboardsQueryDto } from '@n8n/api-types';
import { withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from '@n8n/typeorm';

import { Dashboard } from './dashboard.entity';

@Service()
export class DashboardRepository extends Repository<Dashboard> {
	constructor(dataSource: DataSource) {
		super(Dashboard, dataSource.manager);
	}

	async createDashboard(
		projectId: string,
		dto: CreateDashboardDto,
		trx?: EntityManager,
	): Promise<Dashboard> {
		return await withTransaction(this.manager, trx, async (em) => {
			const dashboard = em.create(Dashboard, {
				name: dto.name,
				description: dto.description ?? null,
				spec: dto.spec,
				tags: dto.tags ?? null,
				archived: false,
				projectId,
			});

			await em.insert(Dashboard, dashboard);

			return await em.findOneOrFail(Dashboard, {
				where: { id: dashboard.id },
				relations: ['project'],
			});
		});
	}

	async deleteDashboard(dashboardId: string, trx?: EntityManager): Promise<boolean> {
		return await withTransaction(this.manager, trx, async (em) => {
			const result = await em.delete(Dashboard, { id: dashboardId });
			return (result.affected ?? 0) > 0;
		});
	}

	async getManyAndCount(options: Partial<ListDashboardsQueryDto>) {
		const query = this.getManyQuery(options);
		const [data, count] = await query.getManyAndCount();
		return { count, data };
	}

	async getMany(options: Partial<ListDashboardsQueryDto>) {
		const query = this.getManyQuery(options);
		return await query.getMany();
	}

	private getManyQuery(options: Partial<ListDashboardsQueryDto>): SelectQueryBuilder<Dashboard> {
		const query = this.createQueryBuilder('dashboard');

		this.applySelections(query);
		this.applyFilters(query, options.filter);
		this.applySorting(query, options.sortBy);
		this.applyPagination(query, options);

		return query;
	}

	private applySelections(query: SelectQueryBuilder<Dashboard>): void {
		query
			.leftJoinAndSelect('dashboard.project', 'project')
			.select([
				'dashboard.id',
				'dashboard.name',
				'dashboard.description',
				'dashboard.tags',
				'dashboard.archived',
				'dashboard.projectId',
				'dashboard.createdAt',
				'dashboard.updatedAt',
				'project.id',
				'project.name',
				'project.type',
				'project.icon',
			]);
	}

	private applyFilters(
		query: SelectQueryBuilder<Dashboard>,
		filter: Partial<ListDashboardsQueryDto>['filter'],
	): void {
		for (const x of ['id', 'projectId'] as const) {
			const content = [filter?.[x]].flat().filter((v) => v !== undefined);
			if (content.length === 0) continue;
			query.andWhere(`dashboard.${x} IN (:...${x}s)`, {
				[x + 's']: content,
			});
		}

		if (filter?.name) {
			const names = Array.isArray(filter.name) ? filter.name : [filter.name];
			names.forEach((name, i) => {
				query.andWhere(`LOWER(dashboard.name) LIKE LOWER(:dashboardName${i})`, {
					[`dashboardName${i}`]: `%${name}%`,
				});
			});
		}

		if (filter?.archived !== undefined) {
			query.andWhere('dashboard.archived = :archived', { archived: filter.archived });
		}
	}

	private applySorting(query: SelectQueryBuilder<Dashboard>, sortBy?: string): void {
		if (!sortBy) {
			query.orderBy('dashboard.updatedAt', 'DESC');
			return;
		}

		const [field, order] = sortBy.split(':');
		const direction = order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

		if (field === 'name') {
			query
				.addSelect('LOWER(dashboard.name)', 'dashboard_name_lower')
				.orderBy('dashboard_name_lower', direction);
		} else if (['createdAt', 'updatedAt'].includes(field)) {
			query.orderBy(`dashboard.${field}`, direction);
		}
	}

	private applyPagination(
		query: SelectQueryBuilder<Dashboard>,
		options: Partial<ListDashboardsQueryDto>,
	): void {
		query.skip(options.skip ?? 0);
		if (options.take !== undefined) query.take(options.take);
	}

	async findFullById(dashboardId: string): Promise<Dashboard | null> {
		return await this.findOne({
			where: { id: dashboardId },
			relations: ['project', 'shares'],
		});
	}
}
