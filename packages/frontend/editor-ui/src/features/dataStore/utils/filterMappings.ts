import type { BackendFilterCondition, FilterOperation } from '../types/dataStoreFilters.types';

export const SPECIAL_COLUMNS = ['add-column', 'ag-Grid-SelectionColumn'] as const;
export const MAX_CONDITIONS = 1;

export const GRID_FILTER_CONFIG = {
	defaultColDef: {
		filter: true,
		filterParams: { maxNumConditions: MAX_CONDITIONS },
	},
	excludedColumns: SPECIAL_COLUMNS,
} as const;

const TEXT_TYPE_TO_BACKEND_MAP: Record<string, BackendFilterCondition> = {
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
};

const NUMBER_DATE_TYPE_TO_BACKEND_MAP: Record<string, BackendFilterCondition> = {
	equals: 'eq',
	notEqual: 'neq',
	lessThan: 'lt',
	lessThanOrEqual: 'lte',
	greaterThan: 'gt',
	greaterThanOrEqual: 'gte',
	null: 'eq',
	notNull: 'neq',
};

export function mapTextTypeToBackend(type: FilterOperation): BackendFilterCondition {
	const condition = TEXT_TYPE_TO_BACKEND_MAP[type];
	if (!condition) {
		throw new Error(`Unknown text type: ${type}`);
	}
	return condition;
}

export function mapNumberDateTypeToBackend(type: FilterOperation): BackendFilterCondition {
	const condition = NUMBER_DATE_TYPE_TO_BACKEND_MAP[type];
	if (!condition) {
		throw new Error(`Unknown number/date type: ${type}`);
	}
	return condition;
}
