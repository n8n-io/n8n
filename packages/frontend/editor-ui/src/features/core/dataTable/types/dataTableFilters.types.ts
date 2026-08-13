export type BackendFilterCondition = 'eq' | 'neq' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';

export type BackendFilterRecord = {
	columnName: string;
	condition: BackendFilterCondition;
	value: string | number | boolean | Date | null;
};

export type BackendFilter = {
	type: 'and';
	filters: BackendFilterRecord[];
};

export type FilterOperation =
	| 'contains'
	| 'equals'
	| 'notEqual'
	| 'startsWith'
	| 'endsWith'
	| 'isEmpty'
	| 'notEmpty'
	| 'null'
	| 'notNull'
	| 'true'
	| 'false'
	| 'inRange'
	| 'lessThan'
	| 'lessThanOrEqual'
	| 'greaterThan'
	| 'greaterThanOrEqual'
	| 'between';

export type FilterModel = {
	[colId: string]: {
		filterType?: 'text' | 'number' | 'date';
		filter?: string | number;
		filterTo?: string | number;
		type: FilterOperation;
		dateFrom?: string;
		dateTo?: string;
	};
};
