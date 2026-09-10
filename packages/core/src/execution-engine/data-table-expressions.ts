import {
	collectStrings,
	extractDataTableRefs,
	isKeyedDataTableRef,
	type DataTableColumnJsType,
	type DataTableColumnReturnJsType,
	type DataTableExpressionRef,
	type DataTableExpressionRows,
	type DataTableRowReturn,
	type KeyedDataTableRef,
	type IExecuteData,
	type INode,
	type INodeExecutionData,
	type IRunExecutionData,
	type IWorkflowExecuteAdditionalData,
	type Workflow,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { getAdditionalKeys } from './node-execution-context/utils/get-additional-keys';

/** Keys per query. One `or` filter with thousands of terms is hard on the database. */
const KEY_BATCH_SIZE = 100;

/** A stored value can come back typed differently from the key that asked for it. */
function matches(stored: DataTableColumnReturnJsType, requested: DataTableColumnJsType): boolean {
	if (stored instanceof Date) {
		return requested instanceof Date
			? stored.getTime() === requested.getTime()
			: String(stored) === String(requested);
	}
	// Enum columns come back as `{ id, value, color }`.
	if (stored !== null && typeof stored === 'object') {
		return String(stored.value) === String(requested);
	}
	return String(stored) === String(requested);
}

function uniqueRefs(node: INode): DataTableExpressionRef[] {
	const byKey = new Map<string, DataTableExpressionRef>();

	for (const text of collectStrings(node.parameters)) {
		for (const ref of extractDataTableRefs(text)) byKey.set(JSON.stringify(ref), ref);
	}

	return [...byKey.values()];
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

	const refs = uniqueRefs(node);
	if (refs.length === 0) return;

	const provider = additionalData['data-table']?.dataTableProxyProvider;
	if (!provider) return;

	const additionalKeys = getAdditionalKeys(additionalData, mode, runExecutionData, {
		nodeName: node.name,
	});

	/**
	 * A key expression gives a different key for each item, so all of them are
	 * resolved. Keyed by the string the expression looks the row up by, which
	 * deduplicates at the same time.
	 */
	const resolveLookupKeys = (ref: KeyedDataTableRef) => {
		const byKey = new Map<string, DataTableColumnJsType>();

		for (let itemIndex = 0; itemIndex < Math.max(connectionInputData.length, 1); itemIndex++) {
			let key: unknown;
			try {
				key = workflow.expression.resolveSimpleParameterValue(
					`={{ ${ref.keyExpression} }}`,
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

			if (ref.accessor === 'row') {
				const id = Number(key);
				if (Number.isFinite(id)) byKey.set(String(key), id);
			} else if (key instanceof Date || ['string', 'number', 'boolean'].includes(typeof key)) {
				byKey.set(String(key), key as DataTableColumnJsType);
			}
		}

		return byKey;
	};

	const service = await provider.getDataTableExpressionProxy(
		workflow,
		additionalData.dataTableProjectId,
	);
	const { data: tables } = await service.tables.getManyAndCount({});
	const idByName = new Map(tables.map((table) => [table.name.toLowerCase(), table.id]));

	const rows: DataTableExpressionRows = {};
	const fetches: Array<Promise<void>> = [];

	for (const ref of refs) {
		const dataTableId = idByName.get(ref.table.toLowerCase());
		if (!dataTableId) continue;

		const target = (rows[ref.table] ??= { row: {}, matched: {} });
		const api = service.rows(dataTableId);

		if (!isKeyedDataTableRef(ref)) {
			const sortBy: ['id', 'ASC' | 'DESC'] = ['id', ref.accessor === 'first' ? 'ASC' : 'DESC'];
			fetches.push(
				api.getManyRowsAndCount({ sortBy, take: 1 }).then(({ data }) => {
					if (data[0]) target[ref.accessor] = data[0];
				}),
			);
			continue;
		}

		const column = ref.accessor === 'row' ? 'id' : ref.column;
		const entries = [...resolveLookupKeys(ref).entries()];

		// Stored under the requested key, because that is what the expression
		// looks the row up by.
		const store = (requested: string, row: DataTableRowReturn) => {
			if (ref.accessor === 'row') target.row[requested] = row;
			else (target.matched[column] ??= {})[requested] = row;
		};

		for (let at = 0; at < entries.length; at += KEY_BATCH_SIZE) {
			const batch = entries.slice(at, at + KEY_BATCH_SIZE);
			fetches.push(
				api
					.getManyRowsAndCount({
						filter: {
							type: 'or',
							filters: batch.map(([, value]) => ({ columnName: column, condition: 'eq', value })),
						},
						sortBy: ['id', 'ASC'],
						take: batch.length,
					})
					.then(({ data }) => {
						for (const [requested, value] of batch) {
							const row = data.find((candidate) => matches(candidate[column], value));
							if (row) store(requested, row);
						}
					}),
			);
		}
	}

	await Promise.all(fetches);

	additionalData.dataTableExpressionRows ??= {};
	additionalData.dataTableExpressionRows[node.name] = rows;
}
