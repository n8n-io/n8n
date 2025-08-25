import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { BaseEntity } from '@n8n/typeorm';

const DATA_TABLE_WARNING_MESSAGE = `The data table module is experimental and subject to change.
Any tables added before the official release may become inaccessible at any point. Use at your own risk.`;

@BackendModule({ name: 'data-store' })
export class DataStoreModule implements ModuleInterface {
	async init() {
		const logger = Container.get(Logger).scoped('data-table');
		logger.warn(DATA_TABLE_WARNING_MESSAGE);

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
