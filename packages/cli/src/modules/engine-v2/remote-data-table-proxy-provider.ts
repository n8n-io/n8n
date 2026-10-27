import { UnimplementedError } from '@n8n/engine';
import type { AdditionalDataContext } from '@n8n/node-engine-compatibility';
import type {
	AddDataTableColumnOptions,
	CreateDataTableOptions,
	DataTable,
	DataTableColumn,
	DataTableColumnJsType,
	DataTableFilter,
	DataTableInsertRowsBulkResult,
	DataTableInsertRowsResult,
	DataTableInsertRowsReturnType,
	DataTableProxyProvider,
	DataTableRow,
	DataTableRowReturn,
	DataTableRowReturnWithState,
	DataTableRows,
	DataTableRowsReturn,
	DeleteDataTableRowsOptions,
	IDataTableProjectAggregateService,
	IDataTableProjectService,
	INode,
	ListDataTableOptions,
	ListDataTableRowsOptions,
	MoveDataTableColumnOptions,
	UpdateDataTableOptions,
	UpdateDataTableRowOptions,
	UpsertDataTableRowOptions,
	Workflow,
} from 'n8n-workflow';
import { NodeOperationError, OperationalError, UserError } from 'n8n-workflow';
import type { z } from 'zod';

import type { EngineDataTablesClient } from './engine-data-tables-client';
import { dataTableCallResultSchemas } from './engine-data-tables.contract';
import type {
	DataTableCall,
	DataTableCallErrorResponse,
	DataTableCallKind,
} from './engine-data-tables.contract';

type WireRow = Extract<DataTableCall, { kind: 'insertRows' }>['rows'][number];
type WireFilter = Extract<DataTableCall, { kind: 'deleteRows' }>['options']['filter'];

/** A cell as JSON carries it. A `Date` becomes its ISO string, which the service accepts. */
function toWireValue(value: DataTableColumnJsType): WireRow[string] {
	return value instanceof Date ? value.toISOString() : value;
}

function toWireRow(row: DataTableRow): WireRow {
	return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, toWireValue(value)]));
}

function toWireFilter(filter: DataTableFilter): WireFilter {
	return {
		type: filter.type,
		filters: filter.filters.map((entry) => ({ ...entry, value: toWireValue(entry.value) })),
	};
}

/** Sends one call for the node that owns the proxy, and returns the raw `data`. */
type SendCall = (call: DataTableCall) => Promise<unknown>;

/** Narrows `data` with the result schema of the call. A body that does not fit is a transport failure. */
function parseResult<T>(
	kind: DataTableCallKind,
	schema: z.ZodType<T, z.ZodTypeDef, unknown>,
	data: unknown,
): T {
	const parsed = schema.safeParse(data);
	if (!parsed.success) {
		throw new OperationalError(
			`Control plane returned a malformed result for data table call "${kind}"`,
		);
	}
	return parsed.data;
}

/** The v1 error the control plane told the data plane to raise. */
function toV1Error(node: INode, error: DataTableCallErrorResponse['error']): Error {
	switch (error.kind) {
		case 'node-operation':
			return new NodeOperationError(node, error.message, { description: error.description });
		case 'user':
			return new UserError(error.message, { level: 'warning' });
	}
}

class RemoteDataTableAggregate implements IDataTableProjectAggregateService {
	constructor(
		private readonly projectId: string,
		private readonly send: SendCall,
	) {}

	getProjectId(): string {
		return this.projectId;
	}

	async createDataTable(options: CreateDataTableOptions): Promise<DataTable> {
		return await this.call(
			{ kind: 'createDataTable', options },
			dataTableCallResultSchemas.createDataTable,
		);
	}

	async getManyAndCount(
		options: ListDataTableOptions,
	): Promise<{ count: number; data: DataTable[] }> {
		return await this.call(
			{ kind: 'getManyAndCount', options },
			dataTableCallResultSchemas.getManyAndCount,
		);
	}

	/** Not served by the control plane: no node calls it, and it would empty the whole project. */
	async deleteDataTableAll(): Promise<boolean> {
		throw new UnimplementedError(
			'Deleting every data table of a project (deleteDataTableAll) is not supported on Engine v2',
		);
	}

	private async call<T>(call: DataTableCall, schema: z.ZodType<T, z.ZodTypeDef, unknown>) {
		return parseResult(call.kind, schema, await this.send(call));
	}
}

class RemoteDataTable implements IDataTableProjectService {
	constructor(
		private readonly dataTableId: string,
		private readonly send: SendCall,
	) {}

	async updateDataTable(options: UpdateDataTableOptions): Promise<boolean> {
		return await this.call(
			{ kind: 'updateDataTable', dataTableId: this.dataTableId, options },
			dataTableCallResultSchemas.updateDataTable,
		);
	}

	async deleteDataTable(): Promise<boolean> {
		return await this.call(
			{ kind: 'deleteDataTable', dataTableId: this.dataTableId },
			dataTableCallResultSchemas.deleteDataTable,
		);
	}

	async getColumns(): Promise<DataTableColumn[]> {
		return await this.call(
			{ kind: 'getColumns', dataTableId: this.dataTableId },
			dataTableCallResultSchemas.getColumns,
		);
	}

	async addColumn(options: AddDataTableColumnOptions): Promise<DataTableColumn> {
		return await this.call(
			{ kind: 'addColumn', dataTableId: this.dataTableId, options },
			dataTableCallResultSchemas.addColumn,
		);
	}

	async moveColumn(columnId: string, options: MoveDataTableColumnOptions): Promise<boolean> {
		return await this.call(
			{ kind: 'moveColumn', dataTableId: this.dataTableId, columnId, options },
			dataTableCallResultSchemas.moveColumn,
		);
	}

	async deleteColumn(columnId: string): Promise<boolean> {
		return await this.call(
			{ kind: 'deleteColumn', dataTableId: this.dataTableId, columnId },
			dataTableCallResultSchemas.deleteColumn,
		);
	}

	async getManyRowsAndCount(
		options: Partial<ListDataTableRowsOptions>,
	): Promise<{ count: number; data: DataTableRowsReturn }> {
		const { filter, ...rest } = options;
		return await this.call(
			{
				kind: 'getManyRowsAndCount',
				dataTableId: this.dataTableId,
				options: { ...rest, filter: filter && toWireFilter(filter) },
			},
			dataTableCallResultSchemas.getManyRowsAndCount,
		);
	}

	async insertRows(rows: DataTableRows, returnType: 'all'): Promise<DataTableRowReturn[]>;
	async insertRows(
		rows: DataTableRows,
		returnType: 'id',
	): Promise<Pick<DataTableRowReturn, 'id'>[]>;
	async insertRows(
		rows: DataTableRows,
		returnType: 'count',
	): Promise<DataTableInsertRowsBulkResult>;
	async insertRows<T extends DataTableInsertRowsReturnType>(
		rows: DataTableRows,
		returnType: T,
	): Promise<DataTableInsertRowsResult<T>>;
	async insertRows(
		rows: DataTableRows,
		returnType: DataTableInsertRowsReturnType,
	): Promise<DataTableInsertRowsResult> {
		return await this.call(
			{
				kind: 'insertRows',
				dataTableId: this.dataTableId,
				rows: rows.map(toWireRow),
				returnType,
			},
			dataTableCallResultSchemas.insertRows,
		);
	}

	async updateRows(
		options: UpdateDataTableRowOptions,
	): Promise<DataTableRowReturn[] | DataTableRowReturnWithState[]> {
		return await this.call(
			{
				kind: 'updateRows',
				dataTableId: this.dataTableId,
				options: {
					filter: toWireFilter(options.filter),
					data: toWireRow(options.data),
					dryRun: options.dryRun,
				},
			},
			dataTableCallResultSchemas.updateRows,
		);
	}

	async upsertRow(
		options: UpsertDataTableRowOptions,
	): Promise<DataTableRowReturn[] | DataTableRowReturnWithState[]> {
		return await this.call(
			{
				kind: 'upsertRow',
				dataTableId: this.dataTableId,
				options: {
					filter: toWireFilter(options.filter),
					data: toWireRow(options.data),
					dryRun: options.dryRun,
				},
			},
			dataTableCallResultSchemas.upsertRow,
		);
	}

	async deleteRows(options: DeleteDataTableRowsOptions): Promise<DataTableRowReturn[]> {
		return await this.call(
			{
				kind: 'deleteRows',
				dataTableId: this.dataTableId,
				options: { filter: toWireFilter(options.filter), dryRun: options.dryRun },
			},
			dataTableCallResultSchemas.deleteRows,
		);
	}

	async clearRows(): Promise<{ deletedCount: number }> {
		return await this.call(
			{ kind: 'clearRows', dataTableId: this.dataTableId },
			dataTableCallResultSchemas.clearRows,
		);
	}

	private async call<T>(call: DataTableCall, schema: z.ZodType<T, z.ZodTypeDef, unknown>) {
		return parseResult(call.kind, schema, await this.send(call));
	}
}

/**
 * The `DataTableProxyProvider` that the engine v2 data plane gives to v1 nodes.
 *
 * The data plane has no control plane database. Every operation goes to the
 * control plane over HTTP, which resolves the project from the workflow and
 * checks the table on each call. A refusal comes back as the v1 error the
 * node expects, so a missing table or a rejected row reads the same on both
 * engines.
 *
 * One instance per execution: the constructor context names the execution the
 * requests are for.
 */
export class RemoteDataTableProxyProvider implements DataTableProxyProvider {
	constructor(
		private readonly client: EngineDataTablesClient,
		private readonly context: AdditionalDataContext,
		// Every request of this execution uses this one signal. The engine has no
		// per-step cancellation signal yet. TODO(CAT-4526): pass the step signal.
		private readonly signal: AbortSignal,
	) {}

	/**
	 * One round trip: `getProjectId()` on the result is synchronous, and the
	 * control plane decides the project. The `projectId` parameter is the v1
	 * override for load options and ephemeral runs, which never reach the data
	 * plane, so it is not sent.
	 */
	async getDataTableAggregateProxy(
		_workflow: Workflow,
		node: INode,
		_projectId?: string,
	): Promise<IDataTableProjectAggregateService> {
		const send = this.senderFor(node);
		const projectId = parseResult(
			'getProjectId',
			dataTableCallResultSchemas.getProjectId,
			await send({ kind: 'getProjectId' }),
		);
		return new RemoteDataTableAggregate(projectId, send);
	}

	/**
	 * No round trip: the control plane checks the table against the project on
	 * every operation, and reports a missing one with the v1 node error. The
	 * node acquires a proxy per item, so a check here would double the calls.
	 */
	async getDataTableProxy(
		_workflow: Workflow,
		node: INode,
		dataTableId: string,
		_projectId?: string,
	): Promise<IDataTableProjectService> {
		return new RemoteDataTable(dataTableId, this.senderFor(node));
	}

	private senderFor(node: INode): SendCall {
		return async (call) => {
			const outcome = await this.client.call(
				{
					execution: {
						executionId: this.context.executionId,
						workflowId: this.context.workflowId,
					},
					consumer: { nodeType: node.type },
					call,
				},
				this.signal,
			);

			if ('error' in outcome) throw toV1Error(node, outcome.error);

			return outcome.data;
		};
	}
}
