import type { DataTableColumnTypeMismatch, DataTableEnumOptionsMismatch } from './data-table.types';
import type { SerializedDataTableColumn } from '../../spec/serialized/data-table.schema';

export interface SchemaIncompatibility {
	missingColumns: string[];
	typeMismatches: DataTableColumnTypeMismatch[];
	enumOptionMismatches?: DataTableEnumOptionsMismatch[];
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
	targetColumns: Array<{ name: string; type: string; options?: string[] | null }>,
	strictEnumOptions = false,
): SchemaIncompatibility | null {
	const targetByName = new Map(targetColumns.map((column) => [column.name, column]));

	const missingColumns: string[] = [];
	const typeMismatches: DataTableColumnTypeMismatch[] = [];
	const enumOptionMismatches: DataTableEnumOptionsMismatch[] = [];

	for (const column of packageColumns) {
		const target = targetByName.get(column.name);
		if (target === undefined) {
			missingColumns.push(column.name);
		} else if (target.type !== column.type) {
			typeMismatches.push({
				column: column.name,
				expectedType: column.type,
				actualType: target.type,
			});
		} else if (column.type === 'enum') {
			const expected = column.options ?? [];
			const actual = target.options ?? [];
			const missingOptions = expected.filter((option) => !actual.includes(option));
			const extraOptions = strictEnumOptions
				? actual.filter((option) => !expected.includes(option))
				: [];
			if (missingOptions.length > 0 || extraOptions.length > 0) {
				enumOptionMismatches.push({
					column: column.name,
					missingOptions,
					...(extraOptions.length > 0 ? { extraOptions } : {}),
				});
			}
		}
	}

	if (
		missingColumns.length === 0 &&
		typeMismatches.length === 0 &&
		enumOptionMismatches.length === 0
	) {
		return null;
	}
	return {
		missingColumns,
		typeMismatches,
		...(enumOptionMismatches.length > 0 ? { enumOptionMismatches } : {}),
	};
}
