import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

const YELLOW = '\x1b[33m';
const CLEAR = '\x1b[0m';
const DATA_TABLE_WARNING_MESSAGE = `[Data table] The Data table module is experimental and subject to change.
Any tables added before the official release may become inaccessible at any point. Use at your own risk.`;

@BackendModule({ name: 'data-table' })
export class DataStoreModule implements ModuleInterface {
	async init() {
		const logger = Container.get(Logger).scoped('data-table');
		logger.warn(`${YELLOW}${DATA_TABLE_WARNING_MESSAGE}${CLEAR}`);

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
