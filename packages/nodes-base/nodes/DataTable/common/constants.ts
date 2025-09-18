import type { DataStoreColumnJsType } from 'n8n-workflow';

export const ANY_CONDITION = 'anyCondition';
export const ALL_CONDITIONS = 'allConditions';

export const ROWS_LIMIT_DEFAULT = 50;

export const SYSTEM_COLUMNS = [
	{ name: 'id', type: 'number' },
	{ name: 'createdAt', type: 'date' },
	{ name: 'updatedAt', type: 'date' },
] as const;

export const SYSTEM_COLUMN_NAMES = SYSTEM_COLUMNS.map((col) => col.name);

export type FilterType = typeof ANY_CONDITION | typeof ALL_CONDITIONS;

export type FieldEntry =
	| {
			keyName: string;
			condition: 'isEmpty' | 'isNotEmpty' | 'isTrue' | 'isFalse';
	  }
	| {
			keyName: string;
			condition: 'eq' | 'neq' | 'like' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';
			keyValue: DataStoreColumnJsType;
	  };
