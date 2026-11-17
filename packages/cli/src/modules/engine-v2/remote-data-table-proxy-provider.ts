import type { HttpRequestClient } from '@n8n/backend-network';
import { UnimplementedError } from '@n8n/engine';
import type { AdditionalDataContext } from '@n8n/node-engine-compatibility';
import type {
	DataTableColumnJsType,
	DataTableFilter,
	DataTableInsertRowsResult,
	DataTableInsertRowsReturnType,
	DataTableProxyProvider,
	DataTableRow,
	DataTableRowReturn,
	DataTableRows,
	IDataTableProjectAggregateService,
	IDataTableProjectService,
	INode,
	ListDataTableOptions,
	ListDataTableRowsOptions,
	Workflow,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { OperationalError, UserError } from '@n8n/errors';
import type { z } from 'zod';

import {
	dataTableCallResultSchemas,
	isDataTableCallErrorResponse,
	isDataTableCallResponse,
} from './engine-data-tables.contract';
import type { DataTableCall, DataTableCallErrorResponse } from './engine-data-tables.contract';
import { DATA_TABLES_CALL_PATH, DATA_TABLES_CALL_REFUSED_STATUS } from './engine-v2.constants';

type WireRow = Extract<DataTableCall, { kind: 'insertRows' }>['rows'][number];
type WireFilter = Extract<DataTableCall, { kind: 'deleteRows' }>['options']['filter'];
type WireListOptions = Extract<DataTableCall, { kind: 'getManyAndCount' }>['options'];

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

/**
 * Keeps the filter keys the v1 proxy honours. v1 ignores any other key, and the
 * control plane pins the project, so the wire does not carry them.
 */
function toWireListOptions(options: ListDataTableOptions): WireListOptions {
	const { filter, ...rest } = options;
	if (!filter) return rest;
	const wireFilter: NonNullable<WireListOptions['filter']> = {};
	if (filter.id !== undefined) wireFilter.id = filter.id;
	if (filter.name !== undefined) wireFilter.name = filter.name;
	return { ...rest, filter: wireFilter };
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

/**
 * The `DataTableProxyProvider` that the engine v2 data plane gives to v1 nodes.
 *
 * One instance per step: the constructor context names the execution the
 * step's requests are for.
 */
export class RemoteDataTableProxyProvider implements DataTableProxyProvider {
	constructor(
		private readonly http: HttpRequestClient,
		private readonly context: AdditionalDataContext,
		private readonly signal: AbortSignal,
	) {}

	/**
	 * Return the proxy for project-level data table operations.
	 * We don't use the workflow or project id since those are resolved on the control plane.
	 */
	async getDataTableAggregateProxy(
		_workflow: Workflow,
		node: INode,
		_projectId?: string,
	): Promise<IDataTableProjectAggregateService> {
		const schemas = dataTableCallResultSchemas;
		// Resolved up front because `getProjectId()` is synchronous.
		const projectId = await this.call(node, { kind: 'getProjectId' }, schemas.getProjectId);

		return {
			getProjectId: () => projectId,

			createDataTable: async (options) =>
				await this.call(node, { kind: 'createDataTable', options }, schemas.createDataTable),

			getManyAndCount: async (options) =>
				await this.call(
					node,
					{ kind: 'getManyAndCount', options: toWireListOptions(options) },
					schemas.getManyAndCount,
				),

			/** Not served by the control plane: no node calls it, and it would empty the whole project. */
			deleteDataTableAll: async () => {
				throw new UnimplementedError(
					'Deleting every data table of a project (deleteDataTableAll) is not supported on Engine v2',
				);
			},
		};
	}

	/**
	 * Return the proxy for the operations on one data table.
	 * We don't use the workflow or project id since those are resolved on the control plane.
	 */
	async getDataTableProxy(
		_workflow: Workflow,
		node: INode,
		dataTableId: string,
		_projectId?: string,
	): Promise<IDataTableProjectService> {
		const schemas = dataTableCallResultSchemas;

		return {
			updateDataTable: async (options) =>
				await this.call(
					node,
					{ kind: 'updateDataTable', dataTableId, options },
					schemas.updateDataTable,
				),

			deleteDataTable: async () =>
				await this.call(node, { kind: 'deleteDataTable', dataTableId }, schemas.deleteDataTable),

			getColumns: async () =>
				await this.call(node, { kind: 'getColumns', dataTableId }, schemas.getColumns),

			addColumn: async (options) =>
				await this.call(node, { kind: 'addColumn', dataTableId, options }, schemas.addColumn),

			moveColumn: async (columnId, options) =>
				await this.call(
					node,
					{ kind: 'moveColumn', dataTableId, columnId, options },
					schemas.moveColumn,
				),

			deleteColumn: async (columnId) =>
				await this.call(
					node,
					{ kind: 'deleteColumn', dataTableId, columnId },
					schemas.deleteColumn,
				),

			getManyRowsAndCount: async (options: Partial<ListDataTableRowsOptions>) => {
				const { filter, ...rest } = options;
				return await this.call(
					node,
					{
						kind: 'getManyRowsAndCount',
						dataTableId,
						options: { ...rest, filter: filter && toWireFilter(filter) },
					},
					schemas.getManyRowsAndCount,
				);
			},

			insertRows: async <T extends DataTableInsertRowsReturnType>(
				rows: DataTableRows,
				returnType: T,
			) => {
				const result = await this.call(
					node,
					{ kind: 'insertRows', dataTableId, rows: rows.map(toWireRow), returnType },
					schemas.insertRows,
				);
				// The schema admits every return type; the control plane answers the one asked for.
				return result as DataTableInsertRowsResult<T>;
			},

			updateRows: async (options) =>
				await this.call(
					node,
					{
						kind: 'updateRows',
						dataTableId,
						options: {
							filter: toWireFilter(options.filter),
							data: toWireRow(options.data),
							dryRun: options.dryRun,
						},
					},
					schemas.updateRows,
				),

			upsertRow: async (options) =>
				await this.call(
					node,
					{
						kind: 'upsertRow',
						dataTableId,
						options: {
							filter: toWireFilter(options.filter),
							data: toWireRow(options.data),
							dryRun: options.dryRun,
						},
					},
					schemas.upsertRow,
				),

			deleteRows: async (options) => {
				const rows = await this.call(
					node,
					{
						kind: 'deleteRows',
						dataTableId,
						options: { filter: toWireFilter(options.filter), dryRun: options.dryRun },
					},
					schemas.deleteRows,
				);
				// A dry run answers rows with state. The proxy type says plain rows, and
				// the v1 proxy returns the same rows under that type, so match it.
				return rows as DataTableRowReturn[];
			},

			clearRows: async () =>
				await this.call(node, { kind: 'clearRows', dataTableId }, schemas.clearRows),
		};
	}

	/**
	 * Send one call to the control plane and return its parsed result.
	 * Error messages omit the response body since it may contain row data.
	 */
	private async call<T>(
		node: INode,
		call: DataTableCall,
		schema: z.ZodType<T, z.ZodTypeDef, unknown>,
	): Promise<T> {
		const response = await this.http.request<unknown>({
			url: DATA_TABLES_CALL_PATH,
			method: 'POST',
			body: {
				execution: {
					executionId: this.context.executionId,
					workflowId: this.context.workflowId,
				},
				consumer: { nodeType: node.type },
				call,
			},
			json: true,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
			// A redirect would forward the token to whatever host it names.
			disableFollowRedirect: true,
			abortSignal: this.signal,
		});

		if (
			response.statusCode === DATA_TABLES_CALL_REFUSED_STATUS &&
			isDataTableCallErrorResponse(response.body)
		) {
			throw toV1Error(node, response.body.error);
		}

		if (response.statusCode >= 300) {
			throw new OperationalError(
				`Control plane refused data table call "${call.kind}" with ${response.statusCode}`,
			);
		}

		if (!isDataTableCallResponse(response.body)) {
			throw new OperationalError(
				`Control plane returned a malformed response for data table call "${call.kind}"`,
			);
		}

		const parsed = schema.safeParse(response.body.data);
		if (!parsed.success) {
			throw new OperationalError(
				`Control plane returned a malformed result for data table call "${call.kind}"`,
			);
		}
		return parsed.data;
	}
}
