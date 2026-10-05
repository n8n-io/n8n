import type { DataTableColumnType } from 'n8n-workflow';

import type { DataTableColumnTypeMismatch, DataTableSchemaOperation } from './data-table.types';
import type {
	SerializedDataTable,
	SerializedDataTableColumn,
} from '../../spec/serialized/data-table.schema';

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

export function diffDataTableSchema(
	packageTable: SerializedDataTable,
	target: {
		name: string;
		columns: Array<{ name: string; type: DataTableColumnType; index: number }>;
	},
): DataTableSchemaOperation[] {
	const packageColumnsByName = new Map(packageTable.columns.map((column) => [column.name, column]));
	const targetColumnsByName = new Map(target.columns.map((column) => [column.name, column]));
	const operations: DataTableSchemaOperation[] = [];

	for (const { name, type } of target.columns) {
		if (!packageColumnsByName.has(name)) {
			operations.push({ kind: 'remove-column', column: name, type });
		}
	}
	for (const { name, type } of target.columns) {
		const packageType = packageColumnsByName.get(name)?.type;
		if (packageType !== undefined && packageType !== type) {
			operations.push({ kind: 'change-column-type', column: name, from: type, to: packageType });
		}
	}
	for (const { name, type } of packageTable.columns) {
		if (!targetColumnsByName.has(name)) operations.push({ kind: 'add-column', column: name, type });
	}
	const isReordered = packageTable.columns.some((column) => {
		const targetIndex = targetColumnsByName.get(column.name)?.index;
		return targetIndex !== undefined && targetIndex !== column.index;
	});
	if (isReordered) operations.push({ kind: 'reorder-columns' });
	if (target.name !== packageTable.name) {
		operations.push({ kind: 'rename-table', from: target.name, to: packageTable.name });
	}

	return operations;
}
