import type { DataGridColumn, DataGridProps } from '../DataGrid.types';

type User = { id: string; name: string; age: number };

const rows: User[] = [];
const columns: Array<DataGridColumn<User>> = [
	{ id: 'name', field: 'name', label: 'Name', type: 'string' },
];
const base = { rows, columns, rowKey: 'id' } as const;
const handler = () => {};

export const clientMode: DataGridProps<User> = base;

export const noPagination: DataGridProps<User> = { ...base, paginationMode: 'none' };

export const serverMode: DataGridProps<User> = {
	...base,
	sortMode: 'server',
	sort: null,
	'onUpdate:sort': handler,
	filterMode: 'server',
	filters: [],
	'onUpdate:filters': handler,
	paginationMode: 'server',
	page: 1,
	itemsPerPage: 20,
	total: 0,
	'onUpdate:page': handler,
	'onUpdate:itemsPerPage': handler,
};

// @ts-expect-error server sort needs a handler
export const serverSortWithoutHandler: DataGridProps<User> = {
	...base,
	sortMode: 'server',
	sort: null,
};

// @ts-expect-error server sort needs the sort state
export const serverSortWithoutState: DataGridProps<User> = {
	...base,
	sortMode: 'server',
	'onUpdate:sort': handler,
};

// @ts-expect-error server filters need a handler
export const serverFiltersWithoutHandler: DataGridProps<User> = {
	...base,
	filterMode: 'server',
	filters: [],
};

// @ts-expect-error server pagination needs the total
export const serverPaginationWithoutTotal: DataGridProps<User> = {
	...base,
	paginationMode: 'server',
	page: 1,
	itemsPerPage: 20,
	'onUpdate:page': handler,
	'onUpdate:itemsPerPage': handler,
};

// @ts-expect-error client pagination does not take a total
export const clientPaginationWithTotal: DataGridProps<User> = {
	...base,
	total: 10,
};

export const unknownRowKey: DataGridProps<User> = {
	...base,
	// @ts-expect-error the row key must be a field of the row
	rowKey: 'email',
};

export const wrongSortHandler: DataGridProps<User> = {
	...base,
	sortMode: 'server',
	sort: null,
	// @ts-expect-error the handler must take the sort state
	'onUpdate:sort': (value: number) => value,
};
