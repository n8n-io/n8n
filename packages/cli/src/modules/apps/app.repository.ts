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
		if (await this.existsBy({ projectId, namespace })) {
			throw new AppNamespaceConflictError(namespace);
		}

		const app = this.create({ projectId, name, namespace });
		return await this.save(app);
	}

	async findManyByProjectId(projectId: string) {
		return await this.findBy({ projectId });
	}

	async updateApp(app: App, updates: Partial<Pick<App, 'name' | 'namespace' | 'theme'>>) {
		if (
			updates.namespace !== undefined &&
			updates.namespace !== app.namespace &&
			(await this.existsBy({ projectId: app.projectId, namespace: updates.namespace }))
		) {
			throw new AppNamespaceConflictError(updates.namespace);
		}

		return await this.save(Object.assign(app, updates));
	}

	async deleteApp(id: string) {
		await this.delete({ id });
	}
}
