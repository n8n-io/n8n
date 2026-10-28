import { ModuleRegistry, ModulesConfig } from '@n8n/backend-common';
import {
	DataTable,
	DataTableAggregateService,
	DataTableColumn,
	DataTableProxyService,
	DataTableRepository,
	DataTableService,
} from '@n8n/backend-module-data-table';
import {
	FavoriteResourceResolverRegistry,
	OwnershipTransferHandlerRegistry,
} from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { ControllerRegistryMetadata, ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { packagedModules } from '../modules.manifest';

describe('packaged data tables', () => {
	it('excludes the disabled module before loading its entrypoint', () => {
		const config = Container.get(ModulesConfig);
		const disabledModules = config.disabledModules;
		config.disabledModules = ['data-table'];

		expect(Container.get(ModuleRegistry).eligibleModules).not.toContain('data-table');
		expect(Container.get(ModuleMetadata).get('data-table')).toBeUndefined();

		config.disabledModules = disabledModules;
	});

	it('loads entities through the manifest without registering routes', async () => {
		const metadata = Container.get(ModuleMetadata);
		const controllers = Container.get(ControllerRegistryMetadata);
		expect(metadata.get('data-table')).toBeUndefined();
		expect([...controllers.controllerClasses]).toEqual([]);

		await packagedModules['data-table']?.();

		const entry = metadata.get('data-table');
		expect(entry).toBeDefined();
		expect([...controllers.controllerClasses]).toEqual([]);
		const module = entry && Container.get(entry.class);
		expect(await module?.entities?.()).toEqual([DataTable, DataTableColumn]);
	});

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
