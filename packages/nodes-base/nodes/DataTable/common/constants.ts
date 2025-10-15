import type { DataTableColumnJsType, DataTableColumnType } from 'n8n-workflow';

export const ANY_CONDITION = 'anyCondition';
export const ALL_CONDITIONS = 'allConditions';

export const ROWS_LIMIT_DEFAULT = 50;

export type FilterType = typeof ANY_CONDITION | typeof ALL_CONDITIONS;

export type KeyNameType = `${string} (${DataTableColumnType})`;

export type FieldEntry =
	| {
			keyName: KeyNameType;
			condition: 'isEmpty' | 'isNotEmpty' | 'isTrue' | 'isFalse';
			path?: string;
	  }
	| {
			keyName: KeyNameType;
			condition?: 'eq' | 'neq' | 'like' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';
			keyValue: DataTableColumnJsType;
			path?: string;
	  };
