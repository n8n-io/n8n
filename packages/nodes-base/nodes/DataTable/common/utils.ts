import type {
	IDataObject,
	INode,
	ListDataStoreContentFilter,
	IDataStoreProjectAggregateService,
	IDataStoreProjectService,
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { FieldEntry, FilterType } from './constants';
import { ALL_FILTERS, ANY_FILTER } from './constants';
import { DATA_TABLE_ID_FIELD } from './fields';

// We need two functions here since the available getNodeParameter
// overloads vary with the index
export async function getDataTableProxyExecute(
	ctx: IExecuteFunctions,
	index: number = 0,
): Promise<IDataStoreProjectService> {
	if (ctx.helpers.getDataStoreProxy === undefined)
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Data Table node but the module is disabled',
		);

	const dataStoreId = ctx.getNodeParameter(DATA_TABLE_ID_FIELD, index, undefined, {
		extractValue: true,
	}) as string;

	return await ctx.helpers.getDataStoreProxy(dataStoreId);
}

export async function getDataTableProxyLoadOptions(
	ctx: ILoadOptionsFunctions,
): Promise<IDataStoreProjectService> {
	if (ctx.helpers.getDataStoreProxy === undefined)
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Data Table node but the module is disabled',
		);

	const dataStoreId = ctx.getNodeParameter(DATA_TABLE_ID_FIELD, undefined, {
		extractValue: true,
	}) as string;

	return await ctx.helpers.getDataStoreProxy(dataStoreId);
}

export async function getDataTableAggregateProxy(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<IDataStoreProjectAggregateService> {
	if (ctx.helpers.getDataStoreAggregateProxy === undefined)
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Data Table node but the module is disabled',
		);

	return await ctx.helpers.getDataStoreAggregateProxy();
}

export function isFieldEntry(obj: unknown): obj is FieldEntry {
	if (obj === null || typeof obj !== 'object') return false;
	return 'keyName' in obj && 'condition' in obj && 'keyValue' in obj;
}

export function isMatchType(obj: unknown): obj is FilterType {
	return typeof obj === 'string' && (obj === ANY_FILTER || obj === ALL_FILTERS);
}

export function buildGetManyFilter(
	fieldEntries: FieldEntry[],
	matchType: FilterType,
): ListDataStoreContentFilter {
	const filters = fieldEntries.map((x) => ({
		columnName: x.keyName,
		condition: x.condition,
		value: x.keyValue,
	}));
	return { type: matchType === 'allFilters' ? 'and' : 'or', filters };
}

export function isFieldArray(value: unknown): value is FieldEntry[] {
	return (
		value !== null && typeof value === 'object' && Array.isArray(value) && value.every(isFieldEntry)
	);
}

export function dataObjectToApiInput(data: IDataObject, node: INode, row: number) {
	return Object.fromEntries(
		Object.entries(data).map(([k, v]) => {
			if (v === undefined || v === null) return [k, null];

			if (Array.isArray(v)) {
				throw new NodeOperationError(
					node,
					`unexpected array input '${JSON.stringify(v)}' in row ${row}`,
				);
			}

			if (!(v instanceof Date) && typeof v === 'object') {
				throw new NodeOperationError(
					node,
					`unexpected object input '${JSON.stringify(v)}' in row ${row}`,
				);
			}

			return [k, v];
		}),
	);
}
