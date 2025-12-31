import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { BaseEntity } from '@n8n/typeorm';

@BackendModule({ name: 'data-store' })
export class DataStoreModule implements ModuleInterface {
	async init() {
		await import('./data-store.controller');
		await import('./data-store-aggregate.controller');

		const { DataStoreService } = await import('./data-store.service');
		await Container.get(DataStoreService).start();

		const { DataStoreAggregateService } = await import('./data-store-aggregate.service');
		await Container.get(DataStoreAggregateService).start();
	}

	@OnShutdown()
	async shutdown() {
		const { DataStoreService } = await import('./data-store.service');
		await Container.get(DataStoreService).shutdown();

		const { DataStoreAggregateService } = await import('./data-store-aggregate.service');
		await Container.get(DataStoreAggregateService).start();
	}

	async entities() {
		const { DataStore } = await import('./data-store.entity');
		const { DataStoreColumn } = await import('./data-store-column.entity');

		return [DataStore, DataStoreColumn] as unknown as Array<new () => BaseEntity>;
	}
}
