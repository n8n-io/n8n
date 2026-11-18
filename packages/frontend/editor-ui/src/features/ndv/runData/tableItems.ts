import {
	compareDataGridValues,
	matchesDataGridFilter,
	type DataGridColumnType,
	type DataGridFilter,
	type DataGridSort,
} from '@n8n/design-system';
import type { INodeExecutionData } from 'n8n-workflow';

export type TableItem = {
	item: INodeExecutionData;
	index: number;
};

type ValueKind = 'number' | 'boolean' | 'string' | 'json';

const getValueKind = (value: unknown): ValueKind => {
	if (typeof value === 'number') return 'number';
	if (typeof value === 'boolean') return 'boolean';
	if (typeof value === 'object') return 'json';
	return 'string';
};

export const inferColumnTypes = (
	items: INodeExecutionData[],
): Record<string, DataGridColumnType> => {
	const kinds = new Map<string, Set<ValueKind>>();
	for (const { json } of items) {
		for (const [key, value] of Object.entries(json ?? {})) {
			const columnKinds = kinds.get(key) ?? new Set<ValueKind>();
			kinds.set(key, columnKinds);
			if (value !== null && value !== undefined) columnKinds.add(getValueKind(value));
		}
	}
	return Object.fromEntries(
		[...kinds].map(([key, columnKinds]) => {
			if (columnKinds.has('json')) return [key, 'json'];
			const [onlyKind] = columnKinds;
			return [key, columnKinds.size === 1 ? onlyKind : 'string'];
		}),
	);
};

const getType = (types: Record<string, DataGridColumnType>, field: string) =>
	types[field] ?? 'string';

export const sortAndFilterTableItems = (
	items: TableItem[],
	sort: DataGridSort,
	filters: DataGridFilter[],
	types: Record<string, DataGridColumnType>,
): TableItem[] => {
	const filtered = items.filter(({ item }) =>
		filters.every((filter) =>
			matchesDataGridFilter(item.json?.[filter.field], filter, getType(types, filter.field)),
		),
	);
	if (!sort) return filtered;

	const direction = sort.direction === 'asc' ? 1 : -1;
	const type = getType(types, sort.field);
	return [...filtered].sort(
		(a, b) =>
			direction *
				compareDataGridValues(a.item.json?.[sort.field], b.item.json?.[sort.field], type) ||
			a.index - b.index,
	);
};
