import type { DataStoreColumnJsType } from 'n8n-workflow';

export const ANY_FILTER = 'anyFilter';
export const ALL_FILTERS = 'allFilters';

export type FilterType = typeof ANY_FILTER | typeof ALL_FILTERS;

export type FieldEntry = {
	keyName: string;
	condition: 'eq' | 'neq' | 'like' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';
	keyValue: DataStoreColumnJsType;
};
