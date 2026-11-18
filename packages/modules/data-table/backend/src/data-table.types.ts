import type { FieldTypeMap } from 'n8n-workflow';

export type DataTableUserTableName = `${string}data_table_user_${string}`;

export const columnTypeToFieldType: Record<string, keyof FieldTypeMap> = {
	// eslint-disable-next-line id-denylist
	number: 'number',
	// eslint-disable-next-line id-denylist
	string: 'string',
	// eslint-disable-next-line id-denylist
	boolean: 'boolean',
	date: 'dateTime',
};

export type DataTableRowActor = { id: string; email: string | null };

/**
 * Who a row operation acts for. `management` ignores the table's row rule.
 * `actor` applies it; a `null` actor is a run without a verified user.
 */
export type RowAccess = { kind: 'management' } | { kind: 'actor'; actor: DataTableRowActor | null };

export const managementRowAccess: RowAccess = { kind: 'management' };

/** The resolved row rule: only rows where `column` equals `value`. */
export type DataTableRowScope = { column: string; value: string };
