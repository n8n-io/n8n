import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'data-table' })
export class DataTableModule implements ModuleInterface {
	async init() {
		await import('./data-table.controller');
		await import('./data-table-aggregate.controller');
		await import('./data-table-uploads.controller');

		const { DataTableService } = await import('./data-table.service');
		await Container.get(DataTableService).start();

		const { OwnershipTransferHandlerRegistry } = await import(
			'@/services/ownership-transfer/ownership-transfer-handler.registry'
		);
		Container.get(OwnershipTransferHandlerRegistry).register({
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

		const { DataTableAggregateService } = await import('./data-table-aggregate.service');
		await Container.get(DataTableAggregateService).start();

		const { DataTableFileCleanupService } = await import('./data-table-file-cleanup.service');
		await Container.get(DataTableFileCleanupService).start();
	}

	@OnShutdown()
	async shutdown() {
		const { DataTableService } = await import('./data-table.service');
		await Container.get(DataTableService).shutdown();

		const { DataTableAggregateService } = await import('./data-table-aggregate.service');
		await Container.get(DataTableAggregateService).shutdown();

		const { DataTableFileCleanupService } = await import('./data-table-file-cleanup.service');
		await Container.get(DataTableFileCleanupService).shutdown();
	}

	async entities() {
		const { DataTable } = await import('./data-table.entity');
		const { DataTableColumn } = await import('./data-table-column.entity');

		return [DataTable, DataTableColumn];
	}

	async context() {
		const { DataTableProxyService } = await import('./data-table-proxy.service');

		return { dataTableProxyProvider: Container.get(DataTableProxyService) };
	}
}
