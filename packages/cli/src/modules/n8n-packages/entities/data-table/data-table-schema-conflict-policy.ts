import { findSchemaIncompatibility } from './data-table-compat';
import type { SchemaIncompatibility } from './data-table-compat';
import type { DataTableSchemaConflictPolicy } from '../../n8n-packages.types';
import type { SerializedDataTableColumn } from '../../spec/serialized/data-table.schema';

type TargetColumns = Array<{ name: string; type: string }>;

/**
 * Decides whether a matched table's schema blocks the import. `keep-existing`
 * accepts a target that satisfies the package schema, even when the target has
 * additional columns of its own; `fail` is the strict drift-detection choice
 * and rejects any difference, including a harmless superset. Both are
 * non-destructive — the matched target table is never altered either way.
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
		const extraColumns = targetColumns
			.map(({ name }) => name)
			.filter((name) => !packageColumnNames.has(name));
		if (extraColumns.length === 0) return incompatibility;

		return { missingColumns: [], typeMismatches: [], ...incompatibility, extraColumns };
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
