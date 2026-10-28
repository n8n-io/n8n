import { ModuleRegistry } from '@n8n/backend-common';
import {
	DataTableAggregateService,
	DataTableProxyService,
	DataTableRepository,
	DataTableService,
} from '@n8n/backend-module-data-table';
import {
	FavoriteResourceResolverRegistry,
	OwnershipTransferHandlerRegistry,
} from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { packagedModules } from '../modules.manifest';

describe('data table lifecycle', () => {
	it.each(['main', 'worker'] as const)(
		'initializes execution context and ownership handlers on %s',
		async (instanceType) => {
			const service = mockInstance(DataTableService);
			const aggregate = mockInstance(DataTableAggregateService);
			const proxy = mockInstance(DataTableProxyService);
			const tables = mockInstance(DataTableRepository);
			const handlers = new OwnershipTransferHandlerRegistry<EntityManager>();
			Container.set(OwnershipTransferHandlerRegistry, handlers);
			const registry = Container.get(ModuleRegistry);

			await packagedModules['data-table']?.();
			await registry.initModules(instanceType, ['data-table']);

			expect(service.start).toHaveBeenCalled();
			expect(aggregate.start).toHaveBeenCalled();
			expect(registry.context.get('data-table')).toEqual({ dataTableProxyProvider: proxy });
			expect(registry.isActive('data-table')).toBe(true);
			expect(Container.get(FavoriteResourceResolverRegistry).get('dataTable')).toBeDefined();
			const handler = handlers.getAll().find(({ resource }) => resource === 'data-table');
			expect(handler).toBeDefined();
			const trx = mock<EntityManager>();
			await handler?.transferAll('source', 'target', trx);
			expect(tables.transferDataTableByProjectId).toHaveBeenCalledWith('source', 'target', trx);
			await handler?.deleteAll('source');
			expect(service.deleteDataTableByProjectId).toHaveBeenCalledWith('source');

			await registry.shutdownModule('data-table');

			expect(service.shutdown).toHaveBeenCalled();
			expect(aggregate.shutdown).toHaveBeenCalled();
			expect(registry.isActive('data-table')).toBe(false);
		},
	);
});
