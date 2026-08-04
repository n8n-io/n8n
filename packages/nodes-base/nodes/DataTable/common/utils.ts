import { DateTime } from 'luxon';
import type {
	IDataObject,
	INode,
	DataTableFilter,
	IDataTableProjectAggregateService,
	IDataTableProjectService,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	DataTableColumnJsType,
	DataTableColumnType,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { FieldEntry, FilterType } from './constants';
import { ALL_CONDITIONS, ANY_CONDITION } from './constants';
import { DATA_TABLE_ID_FIELD, DRY_RUN } from './fields';

type DateLike = { toISOString: () => string };

function isDateLike(v: unknown): v is DateLike {
	return (
		v !== null && typeof v === 'object' && 'toISOString' in v && typeof v.toISOString === 'function'
	);
}

// Helper function to resolve data table ID from resourceLocator
export async function resolveDataTableId(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
	resourceLocator: { mode: 'list' | 'id' | 'name'; value: string },
): Promise<string> {
	if (resourceLocator.mode === 'name') {
		// Look up table by name
		const aggregateProxy = await getDataTableAggregateProxy(ctx);
		const response = await aggregateProxy.getManyAndCount({
			filter: { name: resourceLocator.value.toLowerCase() },
			take: 1,
		});

		if (response.data.length === 0) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Data table with name "${resourceLocator.value}" not found`,
			);
		}

		return response.data[0].id;
	} else {
		// For 'list' and 'id' modes, use the value from the resource locator
		return resourceLocator.value;
	}
}

// We need two functions here since the available getNodeParameter
// overloads vary with the index
export async function getDataTableProxyExecute(
	ctx: IExecuteFunctions,
	index: number = 0,
): Promise<IDataTableProjectService> {
	if (ctx.helpers.getDataTableProxy === undefined)
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Data table node but the module is disabled',
		);

	const resourceLocator = ctx.getNodeParameter(DATA_TABLE_ID_FIELD, index) as {
		mode: 'list' | 'id' | 'name';
		value: string;
	};

	const dataTableId = await resolveDataTableId(ctx, resourceLocator);

	return await ctx.helpers.getDataTableProxy(dataTableId);
}

export async function getDataTableProxyLoadOptions(
	ctx: ILoadOptionsFunctions,
): Promise<IDataTableProjectService | undefined> {
	if (ctx.helpers.getDataTableProxy === undefined)
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Data table node but the module is disabled',
		);

	const resourceLocator = ctx.getNodeParameter(DATA_TABLE_ID_FIELD) as {
		mode: 'list' | 'id' | 'name';
		value: string;
	};

	if (!resourceLocator || !resourceLocator.value) {
		return;
	}

	const dataTableId = await resolveDataTableId(ctx, resourceLocator);

	return await ctx.helpers.getDataTableProxy(dataTableId);
}

export async function getDataTableAggregateProxy(
	ctx: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<IDataTableProjectAggregateService> {
	if (ctx.helpers.getDataTableAggregateProxy === undefined)
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Data table node but the module is disabled',
		);

	return await ctx.helpers.getDataTableAggregateProxy();
}

export function isFieldEntry(obj: unknown): obj is FieldEntry {
	if (obj === null || typeof obj !== 'object') return false;
	return 'keyName' in obj; // keyValue and condition are optional
}

export function isMatchType(obj: unknown): obj is FilterType {
	return typeof obj === 'string' && (obj === ANY_CONDITION || obj === ALL_CONDITIONS);
}

export function buildGetManyFilter(
	fieldEntries: FieldEntry[],
	matchType: FilterType,
	columnTypeMap: Record<string, DataTableColumnType>,
	node: INode,
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
			default: {
				let value = x.keyValue;
				const columnType = columnTypeMap[x.keyName];

				// Convert ISO date strings to Date objects for date columns
				if (columnType === 'date' && typeof value === 'string') {
					const parsed = new Date(value);
					if (isNaN(parsed.getTime())) {
						throw new NodeOperationError(
							node,
							`Invalid date string '${value}' for column '${x.keyName}'`,
						);
					}
					value = parsed;
				}
				return {
					columnName: x.keyName,
					condition: x.condition ?? 'eq',
					value,
				};
			}
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
): Record<string, DataTableColumnJsType> {
	return Object.fromEntries(
		Object.entries(data).map(([k, v]): [string, DataTableColumnJsType] => {
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

export function getDryRunParameter(ctx: IExecuteFunctions, index: number): boolean {
	const dryRun = ctx.getNodeParameter(`options.${DRY_RUN.name}`, index, false);

	if (typeof dryRun !== 'boolean') {
		throw new NodeOperationError(
			ctx.getNode(),
			`unexpected input ${JSON.stringify(dryRun)} for boolean dryRun`,
		);
	}

	return dryRun;
}
