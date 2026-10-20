import { diffDataTableColumns, findSchemaIncompatibility } from './data-table-compat';
import type { SchemaIncompatibility, TargetColumn } from './data-table-compat';
import type { DataTableSchemaConflictPolicy } from '../../n8n-packages.types';
import type { SerializedDataTableColumn } from '../../spec/serialized/data-table.schema';

/**
 * Decides whether a matched table's schema blocks the import. `keep-existing`
 * accepts a target that satisfies the package schema, even when the target has
 * additional columns of its own; `fail` is the strict drift-detection choice
 * and rejects any difference, including a harmless superset. Neither alters
 * the matched target table. `overwrite` never blocks on schema.
 * `overwrite-non-destructive` blocks only when a change removes or retypes a
 * column, and reports the removed and retyped columns of the id-paired diff.
 */
/* eslint-disable @typescript-eslint/naming-convention -- API data table schema conflict policy keys */
const SCHEMA_CONFLICTS: Record<
	DataTableSchemaConflictPolicy,
	(
		packageColumns: SerializedDataTableColumn[],
		targetColumns: TargetColumn[],
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
	'overwrite-non-destructive': (packageColumns, targetColumns) => {
		const destructive = diffDataTableColumns(packageColumns, targetColumns).filter(
			({ destructive }) => destructive,
		);
		if (destructive.length === 0) return null;

		const extraColumns = destructive.flatMap((operation) =>
			operation.kind === 'remove-column' ? [operation.column] : [],
		);
		return {
			missingColumns: [],
			typeMismatches: destructive.flatMap((operation) =>
				operation.kind === 'change-column-type'
					? [{ column: operation.column, expectedType: operation.to, actualType: operation.from }]
					: [],
			),
			...(extraColumns.length > 0 ? { extraColumns } : {}),
		};
	},
};
/* eslint-enable @typescript-eslint/naming-convention */

export function findSchemaConflict(
	policy: DataTableSchemaConflictPolicy,
	packageColumns: SerializedDataTableColumn[],
	targetColumns: TargetColumn[],
): SchemaIncompatibility | null {
	return SCHEMA_CONFLICTS[policy](packageColumns, targetColumns);
}
