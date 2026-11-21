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
