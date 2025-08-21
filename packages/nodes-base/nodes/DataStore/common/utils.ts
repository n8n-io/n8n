import {
	type ListDataStoreContentFilter,
	type IDataStoreProjectAggregateService,
	type IDataStoreProjectService,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	NodeOperationError,
} from 'n8n-workflow';

import type { FieldEntry, FilterType } from './constants';
import { ALL_FILTERS, ANY_FILTER } from './constants';
import { DATA_STORE_ID_FIELD } from './fields';

type IDataStoreProxyFunctions = IExecuteFunctions | ILoadOptionsFunctions;

// We need two functions here since the available getNodeParameter
// overloads vary with the index
export async function getDataStoreProxyExecute(
	ctx: IExecuteFunctions,
	index: number = 0,
): Promise<IDataStoreProjectService> {
	if (ctx.helpers.getDataStoreProxy === undefined)
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Data Store node but the module is disabled',
		);

	const dataStoreId = ctx.getNodeParameter(DATA_STORE_ID_FIELD, index, undefined, {
		extractValue: true,
	}) as string;

	return await ctx.helpers.getDataStoreProxy(dataStoreId);
}

export async function getDataStoreProxyLoadOptions(
	ctx: ILoadOptionsFunctions,
): Promise<IDataStoreProjectService> {
	if (ctx.helpers.getDataStoreProxy === undefined)
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Data Store node but the module is disabled',
		);

	const dataStoreId = ctx.getNodeParameter(DATA_STORE_ID_FIELD, undefined, {
		extractValue: true,
	}) as string;

	return await ctx.helpers.getDataStoreProxy(dataStoreId);
}

export async function getDataStoreAggregateProxy(
	ctx: IDataStoreProxyFunctions,
): Promise<IDataStoreProjectAggregateService> {
	if (ctx.helpers.getDataStoreAggregateProxy === undefined)
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Data Store node but the module is disabled',
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
