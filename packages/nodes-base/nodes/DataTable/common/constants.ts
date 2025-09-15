import type { DataStoreColumnJsType } from 'n8n-workflow';

export const ANY_CONDITION = 'anyCondition';
export const ALL_CONDITIONS = 'allConditions';

export const ROWS_LIMIT_DEFAULT = 50;

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
