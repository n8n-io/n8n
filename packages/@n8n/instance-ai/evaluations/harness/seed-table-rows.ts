// ---------------------------------------------------------------------------
// Synthetic rows for seeded Data Tables (AGENT-1665). The restore inserts them
// with the table. Each cell is checked against its column here, at case load,
// so a typo fails the case before it runs instead of as a 400 mid-restore.
// Rows must be synthetic: real rows are the highest-PII part of a trace.
// ---------------------------------------------------------------------------

import { instanceAiEvalSeedDataTableSchema } from '@n8n/api-types';
import type { z } from 'zod';

/** The restore DTO's own rows schema (cells keyed by column name, at most 1000
 *  rows), so the harness accepts exactly what the restore does. */
export const SeedTableRowsSchema = instanceAiEvalSeedDataTableSchema.shape.rows;

type SeedTableRow = NonNullable<z.infer<typeof SeedTableRowsSchema>>[number];
type SeedCell = SeedTableRow[string];
type SeedColumnType = SeedDataTable['columns'][number]['type'];

type SeedDataTable = z.infer<typeof instanceAiEvalSeedDataTableSchema>;

export type SeedTableView = Pick<SeedDataTable, 'name' | 'columns' | 'rows'>;

export interface SeedRowIssue {
	/** Relative to the table: `['rows', rowIndex, column]`. */
	path: Array<string | number>;
	message: string;
}

/** Null clears a cell in any column. Dates arrive as ISO strings. */
function cellMatches(type: SeedColumnType, cell: SeedCell): boolean {
	if (cell === null) return true;
	if (type === 'date') return typeof cell === 'string' && !Number.isNaN(Date.parse(cell));
	return typeof cell === type;
}

function cellIssue(table: SeedTableView, column: string, cell: SeedCell): string | undefined {
	const declared = table.columns.find((c) => c.name === column);
	if (!declared) return `table "${table.name}" has no column "${column}"`;
	if (cellMatches(declared.type, cell)) return undefined;
	return `${JSON.stringify(cell)} does not fit the ${declared.type} column "${column}" of table "${table.name}"`;
}

/** Every cell that names an undeclared column or does not fit its column's type. */
export function findSeedTableRowIssues(table: SeedTableView): SeedRowIssue[] {
	return (table.rows ?? []).flatMap((row, index) =>
		Object.entries(row).flatMap(([column, cell]) => {
			const message = cellIssue(table, column, cell);
			return message ? [{ path: ['rows', index, column], message }] : [];
		}),
	);
}
