import {
	extractDataTableRefs,
	type DataTableColumnJsType,
	type DataTableExpressionProxy,
	type DataTableExpressionRows,
	type DataTableRowReturn,
	type IExecuteData,
	type INode,
	type INodeExecutionData,
	type IRunExecutionData,
	type IWorkflowExecuteAdditionalData,
	type ListDataTableRowsOptions,
	type Workflow,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { getAdditionalKeys } from './node-execution-context/utils/get-additional-keys';

const isColumnValue = (value: unknown): value is DataTableColumnJsType =>
	value instanceof Date || ['string', 'number', 'boolean'].includes(typeof value);

/** A key that does not fit the column type has no row, the same as a key with no match. */
async function fetchOne(
	api: ReturnType<DataTableExpressionProxy['rows']>,
	options: Pick<ListDataTableRowsOptions, 'filter' | 'sortBy'>,
): Promise<DataTableRowReturn | undefined> {
	try {
		const { data } = await api.getManyRowsAndCount({ sortBy: ['id', 'ASC'], ...options, take: 1 });
		return data[0];
	} catch {
		return undefined;
	}
}

/**
 * Fetches the rows a node's `$datatable` expressions refer to, for
 * `getAdditionalKeys` to expose. Expressions resolve synchronously, so they
 * cannot read the database themselves. A row that is missing stays missing, so
 * the expression resolves to `undefined`.
 */
export async function prefetchDataTableRows(context: {
	workflow: Workflow;
	node: INode;
	additionalData: IWorkflowExecuteAdditionalData;
	runExecutionData: IRunExecutionData;
	runIndex: number;
	connectionInputData: INodeExecutionData[];
	mode: WorkflowExecuteMode;
	executeData: IExecuteData;
}): Promise<void> {
	const { workflow, node, additionalData, runExecutionData, runIndex, mode, executeData } = context;
	const { connectionInputData } = context;

	const refs = extractDataTableRefs(node.parameters);
	if (refs.length === 0) return;

	const provider = additionalData['data-table']?.dataTableProxyProvider;
	if (!provider) return;

	const additionalKeys = getAdditionalKeys(additionalData, mode, runExecutionData, {
		nodeName: node.name,
	});

	/** Every distinct key the expression looks a row up by, one for each input item. */
	const resolveKeys = (keyExpression: string) => {
		const keys = new Map<string, DataTableColumnJsType>();

		for (let itemIndex = 0; itemIndex < Math.max(connectionInputData.length, 1); itemIndex++) {
			let key: unknown;
			try {
				key = workflow.expression.resolveSimpleParameterValue(
					`={{ ${keyExpression} }}`,
					{},
					runExecutionData,
					runIndex,
					itemIndex,
					node.name,
					connectionInputData,
					mode,
					additionalKeys,
					executeData,
				);
			} catch {
				// An unresolvable key has no row to prefetch.
				continue;
			}
			if (isColumnValue(key)) keys.set(String(key), key);
		}

		return keys;
	};

	const service = await provider.getDataTableExpressionProxy(
		workflow,
		additionalData.dataTableProjectId,
	);
	const { data: tables } = await service.tables.getManyAndCount({});

	const rows: DataTableExpressionRows = {};
	const fetches: Array<Promise<void>> = [];

	for (const ref of refs) {
		const dataTableId = tables.find((table) => table.name === ref.table)?.id;
		if (!dataTableId) continue;

		const target = (rows[ref.table] ??= { row: {}, by: {} });
		const api = service.rows(dataTableId);

		if (!('column' in ref)) {
			const sortBy: ListDataTableRowsOptions['sortBy'] = [
				'id',
				ref.accessor === 'first' ? 'ASC' : 'DESC',
			];
			fetches.push(
				fetchOne(api, { sortBy }).then((row) => {
					if (row) target[ref.accessor] = row;
				}),
			);
			continue;
		}

		// ponytail: one query per distinct key; batch with an `or` filter if this shows up in profiles.
		for (const [requested, value] of resolveKeys(ref.keyExpression)) {
			const filter = {
				type: 'and' as const,
				filters: [{ columnName: ref.column, condition: 'eq' as const, value }],
			};
			fetches.push(
				fetchOne(api, { filter }).then((row) => {
					if (!row) return;
					// Stored under the requested key, because that is what the expression looks up.
					if (ref.accessor === 'row') target.row[requested] = row;
					else (target.by[ref.column] ??= {})[requested] = row;
				}),
			);
		}
	}

	await Promise.all(fetches);

	additionalData.dataTableExpressionRows ??= {};
	additionalData.dataTableExpressionRows[node.name] = rows;
}
