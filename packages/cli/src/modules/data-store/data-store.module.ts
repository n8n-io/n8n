import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { BaseEntity } from '@n8n/typeorm';

@BackendModule({ name: 'data-store' })
export class DataStoreModule implements ModuleInterface {
	async init() {
		await import('./data-store.controller');

		const { DataStoreService } = await import('./data-store.service');
		Container.get(DataStoreService).start();
	}

	@OnShutdown()
	async shutdown() {
		const { DataStoreService } = await import('./data-store.service');

		await Container.get(DataStoreService).shutdown();
	}

	async entities() {
		const { DataStoreEntity } = await import('./data-store.entity');
		const { DataStoreColumnEntity } = await import('./data-store-column.entity');

		return [DataStoreEntity, DataStoreColumnEntity] as unknown as Array<new () => BaseEntity>;
	}
}
