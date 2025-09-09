import type { DataStoreColumnJsType } from 'n8n-workflow';

export const ANY_CONDITION = 'anyCondition';
export const ALL_CONDITIONS = 'allConditions';

export type FilterType = typeof ANY_CONDITION | typeof ALL_CONDITIONS;

export type FieldEntry =
	| {
			keyName: string;
			condition: 'isEmpty' | 'isNotEmpty';
	  }
	| {
			keyName: string;
			condition: 'eq' | 'neq' | 'like' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';
			keyValue: DataStoreColumnJsType;
	  };
