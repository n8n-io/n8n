import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { App } from './app.entity';
import { AppNamespaceConflictError } from './errors/app-namespace-conflict.error';

@Service()
export class AppRepository extends Repository<App> {
	constructor(dataSource: DataSource) {
		super(App, dataSource.manager);
	}

	async createApp(projectId: string, name: string, namespace: string, theme: App['theme'] = null) {
		if (await this.existsBy({ namespace })) {
			throw new AppNamespaceConflictError(namespace);
		}

		const app = this.create({ projectId, name, namespace, theme });
		return await this.save(app);
	}

	/** Namespaces are unique instance-wide: an App is served at `/apps/<namespace>`, which carries no project. */
	async findByNamespace(namespace: string) {
		return await this.findOneBy({ namespace });
	}

	async findManyByProjectId(projectId: string) {
		return await this.findBy({ projectId });
	}

	async updateApp(
		app: App,
		updates: Partial<Pick<App, 'name' | 'namespace' | 'theme' | 'auth' | 'components'>>,
	) {
		if (
			updates.namespace !== undefined &&
			updates.namespace !== app.namespace &&
			(await this.existsBy({ namespace: updates.namespace }))
		) {
			throw new AppNamespaceConflictError(updates.namespace);
		}

		return await this.save(Object.assign(app, updates));
	}

	async deleteApp(id: string) {
		await this.delete({ id });
	}

	async setActiveVersionId(app: App, activeVersionId: string | null) {
		return await this.save(Object.assign(app, { activeVersionId }));
	}
}
