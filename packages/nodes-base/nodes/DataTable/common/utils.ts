import { DateTime } from 'luxon';
import type {
	IDataObject,
	INode,
	DataTableFilter,
	IDataStoreProjectAggregateService,
	IDataStoreProjectService,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	DataStoreColumnJsType,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { FieldEntry, FilterType } from './constants';
import { ALL_CONDITIONS, ANY_CONDITION } from './constants';
import { DATA_TABLE_ID_FIELD } from './fields';

type DateLike = { toISOString: () => string };

function isDateLike(v: unknown): v is DateLike {
	return (
		v !== null && typeof v === 'object' && 'toISOString' in v && typeof v.toISOString === 'function'
	);
}

// We need two functions here since the available getNodeParameter
// overloads vary with the index
export async function getDataTableProxyExecute(
	ctx: IExecuteFunctions,
	index: number = 0,
): Promise<IDataStoreProjectService> {
	if (ctx.helpers.getDataStoreProxy === undefined)
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Data table node but the module is disabled',
		);

	const dataStoreId = ctx.getNodeParameter(DATA_TABLE_ID_FIELD, index, undefined, {
		extractValue: true,
	}) as string;

	return await ctx.helpers.getDataStoreProxy(dataStoreId);
}

export async function getDataTableProxyLoadOptions(
	ctx: ILoadOptionsFunctions,
): Promise<IDataStoreProjectService | undefined> {
	if (ctx.helpers.getDataStoreProxy === undefined)
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Data table node but the module is disabled',
		);

	const dataStoreId = ctx.getNodeParameter(DATA_TABLE_ID_FIELD, undefined, {
		extractValue: true,
	}) as string;

	if (!dataStoreId) {
		return;
	}

	return await ctx.helpers.getDataStoreProxy(dataStoreId);
}

export async function getDataTableAggregateProxy(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<IDataStoreProjectAggregateService> {
	if (ctx.helpers.getDataStoreAggregateProxy === undefined)
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Data table node but the module is disabled',
		);

	return await ctx.helpers.getDataStoreAggregateProxy();
}

export function isFieldEntry(obj: unknown): obj is FieldEntry {
	if (obj === null || typeof obj !== 'object') return false;
	return 'keyName' in obj && 'condition' in obj; // keyValue is optional
}

export function isMatchType(obj: unknown): obj is FilterType {
	return typeof obj === 'string' && (obj === ANY_CONDITION || obj === ALL_CONDITIONS);
}

export function buildGetManyFilter(
	fieldEntries: FieldEntry[],
	matchType: FilterType,
): DataTableFilter {
	const filters = fieldEntries.map((x) => {
		switch (x.condition) {
			case 'isEmpty':
				return {
					columnName: x.keyName,
					condition: 'eq' as const,
					value: null,
				};
			case 'isNotEmpty':
				return {
					columnName: x.keyName,
					condition: 'neq' as const,
					value: null,
				};
			case 'isTrue':
				return {
					columnName: x.keyName,
					condition: 'eq' as const,
					value: true,
				};
			case 'isFalse':
				return {
					columnName: x.keyName,
					condition: 'eq' as const,
					value: false,
				};
			default:
				return {
					columnName: x.keyName,
					condition: x.condition,
					value: x.keyValue,
				};
		}
	});
	return { type: matchType === ALL_CONDITIONS ? 'and' : 'or', filters };
}

export function isFieldArray(value: unknown): value is FieldEntry[] {
	return (
		value !== null && typeof value === 'object' && Array.isArray(value) && value.every(isFieldEntry)
	);
}

export function dataObjectToApiInput(
	data: IDataObject,
	node: INode,
	row: number,
): Record<string, DataStoreColumnJsType> {
	return Object.fromEntries(
		Object.entries(data).map(([k, v]): [string, DataStoreColumnJsType] => {
			if (v === undefined || v === null) return [k, null];

			if (Array.isArray(v)) {
				throw new NodeOperationError(
					node,
					`unexpected array input '${JSON.stringify(v)}' in row ${row}`,
				);
			}

			if (v instanceof Date) {
				return [k, v];
			}

			if (typeof v === 'object') {
				// Luxon DateTime
				if (DateTime.isDateTime(v)) {
					return [k, v.toJSDate()];
				}

				if (isDateLike(v)) {
					try {
						const dateObj = new Date(v.toISOString());
						if (isNaN(dateObj.getTime())) {
							throw new Error('Invalid date');
						}
						return [k, dateObj];
					} catch {
						// Fall through
					}
				}

				throw new NodeOperationError(
					node,
					`unexpected object input '${JSON.stringify(v)}' in row ${row}`,
				);
			}

			return [k, v];
		}),
	);
}
