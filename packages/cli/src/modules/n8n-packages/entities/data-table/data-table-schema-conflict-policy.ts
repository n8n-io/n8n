import { findSchemaIncompatibility } from './data-table-compat';
import type { SchemaIncompatibility } from './data-table-compat';
import type { DataTableSchemaConflictPolicy } from '../../n8n-packages.types';
import type { SerializedDataTableColumn } from '../../spec/serialized/data-table.schema';

type TargetColumns = Array<{ name: string; type: string; index: number }>;

/**
 * Decides whether a matched table's schema blocks the import. `keep-existing`
 * accepts a target that satisfies the package schema, even when the target has
 * additional columns of its own; `fail` is the strict drift-detection choice
 * and rejects any difference, including a harmless superset. Neither alters
 * the matched target table. `overwrite` never blocks on schema.
 * `overwrite-non-destructive` blocks with the `fail` result only when a change deletes data.
 */
/* eslint-disable @typescript-eslint/naming-convention -- API data table schema conflict policy keys */
const SCHEMA_CONFLICTS: Record<
	DataTableSchemaConflictPolicy,
	(
		packageColumns: SerializedDataTableColumn[],
		targetColumns: TargetColumns,
	) => SchemaIncompatibility | null
> = {
	'keep-existing': findSchemaIncompatibility,
	fail: (packageColumns, targetColumns) => {
		const incompatibility = findSchemaIncompatibility(packageColumns, targetColumns);

		const packageColumnNames = new Set(packageColumns.map(({ name }) => name));
		const extraColumns = [...targetColumns]
			.sort((a, b) => a.index - b.index)
			.map(({ name }) => name)
			.filter((name) => !packageColumnNames.has(name));
		if (extraColumns.length === 0) return incompatibility;

		return { missingColumns: [], typeMismatches: [], ...incompatibility, extraColumns };
	},
	overwrite: () => null,
	// Must match the `destructive` operations of `diffDataTableSchema`. Revisit with column ids (LIGO-1233).
	'overwrite-non-destructive': (packageColumns, targetColumns) => {
		const conflict = SCHEMA_CONFLICTS.fail(packageColumns, targetColumns);
		if (!conflict) return null;
		return conflict.typeMismatches.length > 0 || conflict.extraColumns ? conflict : null;
	},
};
/* eslint-enable @typescript-eslint/naming-convention */

export function findSchemaConflict(
	policy: DataTableSchemaConflictPolicy,
	packageColumns: SerializedDataTableColumn[],
	targetColumns: TargetColumns,
): SchemaIncompatibility | null {
	return SCHEMA_CONFLICTS[policy](packageColumns, targetColumns);
}
