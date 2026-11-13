import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

import {
	DataTableNotFoundError,
	DataTableProxyService,
	dataTableNotFoundInProject,
	isAllowedNode,
} from '@n8n/backend-module-data-table';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import type { DataTableFilter, IDataTableProjectService } from 'n8n-workflow';

import { OwnershipService } from '@/services/ownership.service';

import type {
	DataTableCall,
	DataTableCallOutcome,
	DataTableCallRequest,
} from './engine-data-tables.contract';

/** What the node says when its helpers are missing. The data plane raises the same text. */
const MODULE_DISABLED_MESSAGE = 'Attempted to use Data table node but the module is disabled';

/** The text `Date.toJSON` gives: the form a Date filter value has after JSON transport. */
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * Gives each filter value on a `date` column that is the JSON form of a Date
 * back as a Date. A v1 node gives the service a Date object, and the database
 * then compares the column as a time. The same instant as text compares as
 * text, which gives other rows. Only a filter with such a value reads the columns.
 */
async function withDateFilterValues(
	table: IDataTableProjectService,
	filter: DataTableFilter,
): Promise<DataTableFilter> {
	const isDateText = (value: unknown): value is string =>
		typeof value === 'string' && ISO_DATE_TIME.test(value);
	if (!filter.filters.some((f) => isDateText(f.value))) return filter;
	const dateColumns = new Set(
		(await table.getColumns()).filter((c) => c.type === 'date').map((c) => c.name),
	);
	if (dateColumns.size === 0) return filter;
	return {
		...filter,
		filters: filter.filters.map((f) =>
			isDateText(f.value) && dateColumns.has(f.columnName) ? { ...f, value: new Date(f.value) } : f,
		),
	};
}

/**
 * Runs one data table operation for the engine v2 data plane.
 *
 * The data tables are owned by the control plane, so this service proxies
 * access for the data plane. The data plane asserts the workflow id. We
 * trust this assertion for an authenticated data plane. This service
 * resolves the project id from the workflow id. The data table service
 * enforces access control: whether that project may reach the target data
 * table. Note: supporting an execution-scoped token is possible future work.
 */
@Service()
export class EngineDataTablesService {
	constructor(
		private readonly moduleRegistry: ModuleRegistry,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	/**
	 * Returns the operation's result, or a refusal the data plane turns into the
	 * error a v1 execution would see. Throws `ForbiddenError` for a node type
	 * outside the allow list. Any other failure is passed on as a server error.
	 */
	async call({ execution, consumer, call }: DataTableCallRequest): Promise<DataTableCallOutcome> {
		if (!this.moduleRegistry.isActive('data-table')) {
			return { error: { kind: 'node-operation', message: MODULE_DISABLED_MESSAGE } };
		}

		if (!isAllowedNode(consumer.nodeType)) {
			this.logger.warn(
				`Refused data table access to node type "${consumer.nodeType}" in workflow "${execution.workflowId}"`,
			);
			throw new ForbiddenError('Data tables are not available to this node type');
		}

		const { id: projectId } = await this.ownershipService.getWorkflowProjectCached(
			execution.workflowId,
		);

		try {
			return { data: await this.run(projectId, call) };
		} catch (error) {
			if (error instanceof DataTableNotFoundError && 'dataTableId' in call) {
				return {
					error: { kind: 'node-operation', ...dataTableNotFoundInProject(call.dataTableId) },
				};
			}
			// The service's own refusals. Their messages are what the node shows.
			if (error instanceof UserError || error instanceof NotFoundError) {
				return { error: { kind: 'user', message: error.message } };
			}
			throw error;
		}
	}

	private async run(projectId: string, call: DataTableCall): Promise<unknown> {
		// Resolved per call: the module is active, so the proxy and its store exist.
		const proxy = Container.get(DataTableProxyService);

		switch (call.kind) {
			case 'getProjectId':
				return projectId;
			case 'getManyAndCount':
				return await proxy.makeAggregateOperations(projectId).getManyAndCount(call.options);
			case 'createDataTable':
				return await proxy.makeAggregateOperations(projectId).createDataTable(call.options);
		}

		// The access check lives in the proxy: every operation looks the table up
		// by id and project, and throws `DataTableNotFoundError` when the table is
		// not in the workflow's project.
		const table = proxy.makeDataTableOperations(projectId, call.dataTableId);

		switch (call.kind) {
			case 'updateDataTable':
				return await table.updateDataTable(call.options);
			case 'deleteDataTable':
				return await table.deleteDataTable();
			case 'getColumns':
				return await table.getColumns();
			case 'addColumn':
				return await table.addColumn(call.options);
			case 'moveColumn':
				return await table.moveColumn(call.columnId, call.options);
			case 'deleteColumn':
				return await table.deleteColumn(call.columnId);
			case 'getManyRowsAndCount':
				return await table.getManyRowsAndCount(
					call.options.filter
						? { ...call.options, filter: await withDateFilterValues(table, call.options.filter) }
						: call.options,
				);
			case 'insertRows':
				return await table.insertRows(call.rows, call.returnType);
			case 'updateRows':
				return await table.updateRows({
					...call.options,
					filter: await withDateFilterValues(table, call.options.filter),
				});
			case 'upsertRow':
				return await table.upsertRow({
					...call.options,
					filter: await withDateFilterValues(table, call.options.filter),
				});
			case 'deleteRows':
				return await table.deleteRows({
					...call.options,
					filter: await withDateFilterValues(table, call.options.filter),
				});
			case 'clearRows':
				return await table.clearRows();
		}
	}
}
