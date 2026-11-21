import type {
	DataGridFilter,
	DataGridFilterOperator,
	DataGridFilterValue,
} from '@n8n/design-system';

import type {
	BackendFilter,
	BackendFilterCondition,
	BackendFilterRecord,
} from '../types/dataTableFilters.types';

type FixedCondition = { condition: BackendFilterCondition; value: DataGridFilterValue };

const VALUE_CONDITIONS: Partial<Record<DataGridFilterOperator, BackendFilterCondition>> = {
	contains: 'ilike',
	equals: 'eq',
	notEqual: 'neq',
	lessThan: 'lt',
	lessThanOrEqual: 'lte',
	greaterThan: 'gt',
	greaterThanOrEqual: 'gte',
};

const FIXED_CONDITIONS: Partial<Record<DataGridFilterOperator, FixedCondition>> = {
	isEmpty: { condition: 'eq', value: '' },
	notEmpty: { condition: 'neq', value: '' },
	null: { condition: 'eq', value: null },
	notNull: { condition: 'neq', value: null },
	true: { condition: 'eq', value: true },
	false: { condition: 'eq', value: false },
};

const toBackendValue = (value: DataGridFilterValue | undefined) =>
	value instanceof Date ? value.toISOString() : (value ?? null);

const toBackendRecords = (filter: DataGridFilter): BackendFilterRecord[] => {
	const columnName = filter.field;
	if (filter.operator === 'between') {
		return [
			{ columnName, condition: 'gte', value: toBackendValue(filter.value) },
			{ columnName, condition: 'lte', value: toBackendValue(filter.valueTo) },
		];
	}

	const fixed = FIXED_CONDITIONS[filter.operator];
	if (fixed) return [{ columnName, ...fixed }];

	const condition = VALUE_CONDITIONS[filter.operator];
	return condition ? [{ columnName, condition, value: toBackendValue(filter.value) }] : [];
};

export const toBackendFilter = (filters: DataGridFilter[]): BackendFilter | undefined => {
	const records = filters.flatMap(toBackendRecords);
	return records.length > 0 ? { type: 'and', filters: records } : undefined;
};
