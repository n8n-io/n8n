import type { DataTableColumnTypeMismatch } from './data-table.types';
import type { SerializedDataTableColumn } from '../../spec/serialized/data-table.schema';

export interface SchemaIncompatibility {
	missingColumns: string[];
	typeMismatches: DataTableColumnTypeMismatch[];
	/** Target columns not in the package schema; only reported by the strict `fail` conflict policy. */
	extraColumns?: string[];
}

/**
 * A target table is compatible when it has every package column with the same
 * name (case-sensitive) and type. Extra target columns are tolerated; column
 * `index` is display order and never part of compatibility.
 */
export function findSchemaIncompatibility(
	packageColumns: SerializedDataTableColumn[],
	targetColumns: Array<{ name: string; type: string }>,
): SchemaIncompatibility | null {
	const targetTypeByName = new Map(targetColumns.map((column) => [column.name, column.type]));

	const missingColumns: string[] = [];
	const typeMismatches: DataTableColumnTypeMismatch[] = [];

	for (const column of packageColumns) {
		const targetType = targetTypeByName.get(column.name);
		if (targetType === undefined) {
			missingColumns.push(column.name);
		} else if (targetType !== column.type) {
			typeMismatches.push({
				column: column.name,
				expectedType: column.type,
				actualType: targetType,
			});
		}
	}

	if (missingColumns.length === 0 && typeMismatches.length === 0) return null;
	return { missingColumns, typeMismatches };
}
