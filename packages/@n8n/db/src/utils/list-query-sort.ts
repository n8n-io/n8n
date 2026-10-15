export type ListQuerySortDirection = 'ASC' | 'DESC';

export type ListQuerySort = {
	column: string;
	direction: ListQuerySortDirection;
};

export function parseListQuerySortBy(sortBy: string): ListQuerySort {
	const [column, order] = sortBy.split(':');
	return {
		column,
		direction: order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC',
	};
}
