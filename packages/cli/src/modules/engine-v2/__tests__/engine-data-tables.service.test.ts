import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import type {
	DataTableColumn,
	IDataTableProjectAggregateService,
	IDataTableProjectService,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';
import type { OwnershipService } from '@/services/ownership.service';

import type { DataTableCall, DataTableCallRequest } from '../engine-data-tables.contract';
import { EngineDataTablesService } from '../engine-data-tables.service';

const envelope = {
	execution: { executionId: 'exec-1', workflowId: 'wf-1' },
	consumer: { nodeType: 'n8n-nodes-base.dataTable' },
};

const filter = {
	type: 'and' as const,
	filters: [{ columnName: 'total', condition: 'gt' as const, value: 10 }],
};

const requestFor = (call: DataTableCall): DataTableCallRequest => ({ ...envelope, call });

describe('EngineDataTablesService', () => {
	let moduleRegistry: ModuleRegistry;
	let ownershipService: OwnershipService;
	let proxyService: DataTableProxyService;
	let aggregate: IDataTableProjectAggregateService;
	let table: IDataTableProjectService;
	let logger: Logger;
	let service: EngineDataTablesService;

	beforeEach(() => {
		moduleRegistry = mock<ModuleRegistry>();
		ownershipService = mock<OwnershipService>();
		proxyService = mock<DataTableProxyService>();
		aggregate = mock<IDataTableProjectAggregateService>();
		table = mock<IDataTableProjectService>();
		logger = mock<Logger>();

		vi.mocked(moduleRegistry.isActive).mockReturnValue(true);
		vi.mocked(ownershipService.getWorkflowProjectCached).mockResolvedValue(
			mock<Project>({ id: 'project-1' }),
		);
		vi.mocked(proxyService.makeAggregateOperations).mockReturnValue(aggregate);
		vi.mocked(proxyService.makeDataTableOperations).mockReturnValue(table);
		// The service resolves the proxy lazily, so a run with the data-table
		// module off never instantiates it.
		Container.set(DataTableProxyService, proxyService);

		service = new EngineDataTablesService(
			moduleRegistry,
			ownershipService,
			mock<Logger>({ scoped: vi.fn().mockReturnValue(logger) }),
		);
	});

	afterEach(() => {
		Container.reset();
	});

	describe('call', () => {
		it('returns the result of the operation as data', async () => {
			const columns: DataTableColumn[] = [
				{ id: 'col-1', name: 'total', type: 'number', index: 0, dataTableId: 'dt-1' },
			];
			vi.mocked(table.getColumns).mockResolvedValue(columns);

			await expect(
				service.call(requestFor({ kind: 'getColumns', dataTableId: 'dt-1' })),
			).resolves.toEqual({ data: columns });
		});

		it('resolves the project from the workflow, so the data plane cannot name one', async () => {
			await service.call(requestFor({ kind: 'getColumns', dataTableId: 'dt-1' }));

			expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledExactlyOnceWith('wf-1');
			expect(proxyService.makeDataTableOperations).toHaveBeenCalledExactlyOnceWith(
				'project-1',
				'dt-1',
			);
		});

		it('answers getProjectId from the resolved project without touching the store', async () => {
			await expect(service.call(requestFor({ kind: 'getProjectId' }))).resolves.toEqual({
				data: 'project-1',
			});
			expect(proxyService.makeAggregateOperations).not.toHaveBeenCalled();
			expect(proxyService.makeDataTableOperations).not.toHaveBeenCalled();
		});

		describe('dispatches each kind to the matching operation', () => {
			it.each<[DataTableCall, () => unknown, unknown[]]>([
				[
					{ kind: 'getManyAndCount', options: { filter: { name: 'orders' }, take: 5 } },
					() => aggregate.getManyAndCount,
					[{ filter: { name: 'orders' }, take: 5 }],
				],
				[
					{ kind: 'createDataTable', options: { name: 'orders', columns: [] } },
					() => aggregate.createDataTable,
					[{ name: 'orders', columns: [] }],
				],
				[
					{ kind: 'updateDataTable', dataTableId: 'dt-1', options: { name: 'renamed' } },
					() => table.updateDataTable,
					[{ name: 'renamed' }],
				],
				[{ kind: 'deleteDataTable', dataTableId: 'dt-1' }, () => table.deleteDataTable, []],
				[{ kind: 'getColumns', dataTableId: 'dt-1' }, () => table.getColumns, []],
				[
					{ kind: 'addColumn', dataTableId: 'dt-1', options: { name: 'paid', type: 'boolean' } },
					() => table.addColumn,
					[{ name: 'paid', type: 'boolean' }],
				],
				[
					{
						kind: 'moveColumn',
						dataTableId: 'dt-1',
						columnId: 'col-1',
						options: { targetIndex: 2 },
					},
					() => table.moveColumn,
					['col-1', { targetIndex: 2 }],
				],
				[
					{ kind: 'deleteColumn', dataTableId: 'dt-1', columnId: 'col-1' },
					() => table.deleteColumn,
					['col-1'],
				],
				[
					{
						kind: 'getManyRowsAndCount',
						dataTableId: 'dt-1',
						options: { filter, sortBy: ['total', 'DESC'], take: 10, skip: 20 },
					},
					() => table.getManyRowsAndCount,
					[{ filter, sortBy: ['total', 'DESC'], take: 10, skip: 20 }],
				],
				[
					{ kind: 'insertRows', dataTableId: 'dt-1', rows: [{ total: 1 }], returnType: 'id' },
					() => table.insertRows,
					[[{ total: 1 }], 'id'],
				],
				[
					{
						kind: 'updateRows',
						dataTableId: 'dt-1',
						options: { filter, data: { paid: true }, dryRun: true },
					},
					() => table.updateRows,
					[{ filter, data: { paid: true }, dryRun: true }],
				],
				[
					{ kind: 'upsertRow', dataTableId: 'dt-1', options: { filter, data: { paid: true } } },
					() => table.upsertRow,
					[{ filter, data: { paid: true } }],
				],
				[
					{ kind: 'deleteRows', dataTableId: 'dt-1', options: { filter, dryRun: false } },
					() => table.deleteRows,
					[{ filter, dryRun: false }],
				],
				[{ kind: 'clearRows', dataTableId: 'dt-1' }, () => table.clearRows, []],
			])('%o', async (call, operation, args) => {
				const result = { for: call.kind };
				vi.mocked(operation() as () => unknown).mockResolvedValue(result);

				await expect(service.call(requestFor(call))).resolves.toEqual({ data: result });
				expect(operation()).toHaveBeenCalledExactlyOnceWith(...args);
			});
		});

		it('refuses with the node text when the data-table module is off, before resolving anything', async () => {
			vi.mocked(moduleRegistry.isActive).mockReturnValue(false);

			await expect(
				service.call(requestFor({ kind: 'getColumns', dataTableId: 'dt-1' })),
			).resolves.toEqual({
				error: {
					kind: 'node-operation',
					message: 'Attempted to use Data table node but the module is disabled',
				},
			});
			expect(moduleRegistry.isActive).toHaveBeenCalledWith('data-table');
			expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
		});

		it('refuses a node type that may not use data tables, as the v1 proxy does', async () => {
			const request = {
				...requestFor({ kind: 'getColumns', dataTableId: 'dt-1' }),
				consumer: { nodeType: 'n8n-nodes-base.httpRequest' },
			};

			await expect(service.call(request)).rejects.toThrow(ForbiddenError);
			expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledOnce();
		});

		it('reports a missing table with the text the v1 proxy gives the node', async () => {
			vi.mocked(table.getColumns).mockRejectedValue(new DataTableNotFoundError('dt-1'));

			await expect(
				service.call(requestFor({ kind: 'getColumns', dataTableId: 'dt-1' })),
			).resolves.toEqual({
				error: {
					kind: 'node-operation',
					message: "Data table with ID 'dt-1' could not be found in this project",
					description:
						'It may have been deleted, or skipped when the workflow was imported. Choose an existing data table in the node.',
				},
			});
		});

		it("reports a validation failure with the service's own message", async () => {
			vi.mocked(table.insertRows).mockRejectedValue(
				new DataTableValidationError("unknown column name 'nope'"),
			);

			await expect(
				service.call(
					requestFor({ kind: 'insertRows', dataTableId: 'dt-1', rows: [], returnType: 'all' }),
				),
			).resolves.toEqual({
				error: {
					kind: 'user',
					message: "Validation error with data table request: unknown column name 'nope'",
				},
			});
		});

		it('reports a missing column as a user error, because the node shows that message', async () => {
			vi.mocked(table.deleteColumn).mockRejectedValue(new NotFoundError('no such column'));

			await expect(
				service.call(requestFor({ kind: 'deleteColumn', dataTableId: 'dt-1', columnId: 'c' })),
			).resolves.toEqual({ error: { kind: 'user', message: 'no such column' } });
		});

		it('passes any other failure on, so it is reported as a server error', async () => {
			const error = new Error('connection reset');
			vi.mocked(table.getColumns).mockRejectedValue(error);

			await expect(
				service.call(requestFor({ kind: 'getColumns', dataTableId: 'dt-1' })),
			).rejects.toBe(error);
		});
	});
});
