export type BackendFilterCondition = 'eq' | 'neq' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte';

export type BackendFilterRecord = {
	columnName: string;
	condition: BackendFilterCondition;
	value: string | number | boolean | Date | null;
	path?: string;
};

export type BackendFilter = {
	type: 'and';
	filters: BackendFilterRecord[];
};

export type FilterOperation =
	| 'contains'
	| 'equals'
	| 'notEqual'
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
	| 'between'
	| 'empty';

export type FilterModel = {
	[colId: string]: {
		filterType?: 'text' | 'boolean' | 'number' | 'date' | 'json';
		filter?: string | number;
		filterTo?: string | number;
		type: FilterOperation;
		dateFrom?: string;
		dateTo?: string;
		path?: string;
	};
};
