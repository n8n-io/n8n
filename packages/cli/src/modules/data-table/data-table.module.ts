import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'data-table' })
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
		const { DataTable } = await import('./data-table.entity');
		const { DataTableColumn } = await import('./data-table-column.entity');

		return [DataTable, DataTableColumn];
	}

	async context() {
		const { DataStoreProxyService } = await import('./data-store-proxy.service');

		return { dataStoreProxyProvider: Container.get(DataStoreProxyService) };
	}
}
