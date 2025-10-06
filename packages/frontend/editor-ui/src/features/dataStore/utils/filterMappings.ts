import type { BackendFilterCondition, FilterOperation } from '../types/dataStoreFilters.types';

export const SPECIAL_COLUMNS = ['add-column', 'ag-Grid-SelectionColumn'] as const;
export const isSpecialColumn = (value: unknown): value is (typeof SPECIAL_COLUMNS)[number] =>
	typeof value === 'string' && (SPECIAL_COLUMNS as readonly string[]).includes(value);
export const MAX_CONDITIONS = 1;

export const GRID_FILTER_CONFIG = {
	defaultColDef: {
		filter: true,
		filterParams: {
			maxNumConditions: MAX_CONDITIONS,
			buttons: ['reset'],
		},
	},
	excludedColumns: SPECIAL_COLUMNS,
} as const;

const TEXT_TYPE_TO_BACKEND_MAP: Partial<Record<FilterOperation, BackendFilterCondition>> = {
	contains: 'ilike',
	equals: 'eq',
	notEqual: 'neq',
	startsWith: 'ilike',
	endsWith: 'ilike',
	isEmpty: 'eq',
	notEmpty: 'neq',
	null: 'eq',
	notNull: 'neq',
	true: 'eq',
	false: 'eq',
} as const;

const NUMBER_DATE_TYPE_TO_BACKEND_MAP: Partial<Record<FilterOperation, BackendFilterCondition>> = {
	equals: 'eq',
	notEqual: 'neq',
	lessThan: 'lt',
	lessThanOrEqual: 'lte',
	greaterThan: 'gt',
	greaterThanOrEqual: 'gte',
	null: 'eq',
	notNull: 'neq',
} as const;

export function mapTextTypeToBackend(
	type: keyof typeof TEXT_TYPE_TO_BACKEND_MAP,
): BackendFilterCondition {
	const condition = TEXT_TYPE_TO_BACKEND_MAP[type];
	if (!condition) {
		throw new Error(`Unknown text type: ${type}`);
	}
	return condition;
}

export function mapNumberDateTypeToBackend(
	type: keyof typeof NUMBER_DATE_TYPE_TO_BACKEND_MAP,
): BackendFilterCondition {
	const condition = NUMBER_DATE_TYPE_TO_BACKEND_MAP[type];
	if (!condition) {
		throw new Error(`Unknown number/date type: ${type}`);
	}
	return condition;
}
