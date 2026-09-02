import type { DatatableColumn, DatatableRow } from '../../types';

/** Extracted from the SFC so the generic props are nameable in the emitted declaration (TS4082). */
export interface DatatableProps<Item extends DatatableRow = DatatableRow> {
	columns: DatatableColumn[];
	rows: Item[];
	currentPage?: number;
	pagination?: boolean;
	rowsPerPage?: number;
}
