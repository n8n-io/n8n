import type { DatatableColumn, DatatableRow } from '../../types';

export interface DatatableProps<Item extends DatatableRow> {
	columns: DatatableColumn[];
	rows: Item[];
	currentPage?: number;
	pagination?: boolean;
	rowsPerPage?: number;
}
