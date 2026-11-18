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

/**
 * The resolved row rule: a row is visible when, for any condition, its column
 * holds one of `values`. An owner condition (`id`/`email`) has one value; a
 * `project` condition has the actor's project ids.
 */
export type DataTableRowScope = {
	conditions: Array<{ column: string; match: 'id' | 'email' | 'project'; values: string[] }>;
};
