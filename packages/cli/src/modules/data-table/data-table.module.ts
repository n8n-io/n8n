import { OwnershipTransferHandlerRegistry } from '@n8n/backend-services';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'data-table' })
export class DataTableModule implements ModuleInterface {
	async init() {
		await import('./data-table.controller.js');
		await import('./data-table-aggregate.controller.js');
		await import('./data-table-uploads.controller.js');

		const { DataTableService } = await import('./data-table.service.js');
		await Container.get(DataTableService).start();

		Container.get<
			OwnershipTransferHandlerRegistry<
				Parameters<InstanceType<typeof DataTableService>['transferDataTablesByProjectId']>[2]
			>
		>(OwnershipTransferHandlerRegistry).register({
			resource: 'data-table',
			transferAll: async (fromProjectId, toProjectId, trx) => {
				await Container.get(DataTableService).transferDataTablesByProjectId(
					fromProjectId,
					toProjectId,
					trx,
				);
			},
			deleteAll: async (projectId) => {
				await Container.get(DataTableService).deleteDataTableByProjectId(projectId);
			},
		});

		const { registerFavoriteResolver } = await import('./register-favorite-resolver.js');
		registerFavoriteResolver();

		const { DataTableAggregateService } = await import('./data-table-aggregate.service.js');
		await Container.get(DataTableAggregateService).start();

		const { DataTableFileCleanupService } = await import('./data-table-file-cleanup.service.js');
		await Container.get(DataTableFileCleanupService).start();
	}

	@OnShutdown()
	async shutdown() {
		const { DataTableService } = await import('./data-table.service.js');
		await Container.get(DataTableService).shutdown();

		const { DataTableAggregateService } = await import('./data-table-aggregate.service.js');
		await Container.get(DataTableAggregateService).shutdown();

		const { DataTableFileCleanupService } = await import('./data-table-file-cleanup.service.js');
		await Container.get(DataTableFileCleanupService).shutdown();
	}

	async entities() {
		const { DataTable } = await import('./data-table.entity.js');
		const { DataTableColumn } = await import('./data-table-column.entity.js');

		return [DataTable, DataTableColumn];
	}

	async context() {
		const { DataTableProxyService } = await import('./data-table-proxy.service.js');

		return { dataTableProxyProvider: Container.get(DataTableProxyService) };
	}
}
