import type { AppBinding, ListAppsQueryDto } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { App } from './app.entity';
import { AppNamespaceConflictError } from './errors/app-namespace-conflict.error';

@Service()
export class AppRepository extends Repository<App> {
	constructor(dataSource: DataSource) {
		super(App, dataSource.manager);
	}

	async createApp(projectId: string, name: string, namespace: string) {
		if (await this.existsBy({ namespace })) {
			throw new AppNamespaceConflictError(namespace);
		}

		const app = this.create({ projectId, name, namespace });
		return await this.save(app);
	}

	/** Namespaces are unique instance-wide: an App is served at `/apps/<namespace>`, which carries no project. */
	async findByNamespace(namespace: string) {
		return await this.findOneBy({ namespace });
	}

	async findByProjectIdsPaginated(
		projectIds: string[],
		{ skip, take, name, sortBy }: ListAppsQueryDto,
	): Promise<{ count: number; data: App[] }> {
		if (projectIds.length === 0) return { count: 0, data: [] };

		const [field, direction] = (sortBy ?? 'updatedAt:desc').split(':');
		const query = this.createQueryBuilder('app')
			.where('app.projectId IN (:...projectIds)', { projectIds })
			.orderBy(`app.${field}`, direction === 'asc' ? 'ASC' : 'DESC')
			.skip(skip)
			.take(take);
		// sqlite has no ILIKE; LOWER() on both sides is what the sibling repositories do.
		if (name) query.andWhere('LOWER(app.name) LIKE LOWER(:name)', { name: `%${name}%` });

		const [data, count] = await query.getManyAndCount();
		return { count, data };
	}

	async countByProjectId(projectId: string): Promise<number> {
		return await this.countBy({ projectId });
	}

	async updateApp(app: App, updates: Partial<Pick<App, 'name' | 'namespace' | 'theme'>>) {
		if (
			updates.namespace !== undefined &&
			updates.namespace !== app.namespace &&
			(await this.existsBy({ namespace: updates.namespace }))
		) {
			throw new AppNamespaceConflictError(updates.namespace);
		}

		return await this.save(Object.assign(app, updates));
	}

	async updateBindings(app: App, bindings: AppBinding[]) {
		return await this.save(Object.assign(app, { bindings }));
	}

	async setActiveVersionId(id: string, activeVersionId: string | null) {
		await this.update({ id }, { activeVersionId });
	}

	async deleteApp(id: string) {
		await this.delete({ id });
	}
}
