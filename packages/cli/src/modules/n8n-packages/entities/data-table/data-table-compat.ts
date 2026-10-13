import type { DataTableColumnType } from 'n8n-workflow';

import { pairDataTableColumns } from '@/modules/data-table/utils/pair-columns';

import type { DataTableColumnTypeMismatch, DataTableSchemaOperation } from './data-table.types';
import type {
	SerializedDataTable,
	SerializedDataTableColumn,
} from '../../spec/serialized/data-table.schema';

export type TargetColumn = { id?: string; name: string; type: DataTableColumnType; index: number };

export interface SchemaIncompatibility {
	missingColumns: string[];
	typeMismatches: DataTableColumnTypeMismatch[];
	/** Target columns not in the package schema; reported by the `fail` and `overwrite-non-destructive` policies. */
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
	target: { name: string; columns: TargetColumn[] },
): DataTableSchemaOperation[] {
	const operations = diffDataTableColumns(packageTable.columns, target.columns);
	if (target.name !== packageTable.name) {
		operations.push({
			kind: 'rename-table',
			from: target.name,
			to: packageTable.name,
			destructive: false,
		});
	}
	return operations;
}

/** A retyped column is dropped and added again, so a rename of that column is reported next to its type change. */
export function diffDataTableColumns(
	packageColumns: SerializedDataTableColumn[],
	targetColumns: TargetColumn[],
): DataTableSchemaOperation[] {
	const { pairs, added, removed } = pairDataTableColumns(
		packageColumns,
		[...targetColumns].sort((a, b) => a.index - b.index),
	);
	const operations: DataTableSchemaOperation[] = removed.map(({ name, type }) => ({
		kind: 'remove-column',
		column: name,
		type,
		destructive: true,
	}));

	for (const { source, target } of pairs) {
		if (source.type !== target.type) {
			operations.push({
				kind: 'change-column-type',
				column: source.name,
				from: target.type,
				to: source.type,
				destructive: true,
			});
		}
	}
	for (const { source, target } of pairs) {
		if (source.name !== target.name) {
			operations.push({
				kind: 'rename-column',
				from: target.name,
				to: source.name,
				destructive: false,
			});
		}
	}
	for (const { name, type } of added) {
		operations.push({ kind: 'add-column', column: name, type, destructive: false });
	}
	const isReordered = pairs.some(
		({ source }, position) => position > 0 && source.index <= pairs[position - 1].source.index,
	);
	if (isReordered) operations.push({ kind: 'reorder-columns', destructive: false });

	return operations;
}
