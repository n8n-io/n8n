import {
	dataTableEnumOptionsSchema,
	dataTableEnumOptionsInputSchema,
	getDefaultDataTableEnumColor,
	type DataTableCreateColumnSchema,
	type DataTableEnumOption,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import type {
	DataTableColumn,
	DataTableColumnReturnJsType,
	DataTableRowReturn,
	DataTableRowReturnWithState,
} from 'n8n-workflow';

import { DataTableValidationError } from './errors/data-table-validation.error';

export type NormalizedDataTableCreateColumn = Omit<DataTableCreateColumnSchema, 'options'> & {
	options?: DataTableEnumOption[];
};

export function normalizeEnumOptions(
	options: unknown,
): DataTableEnumOption[] {
	const input = dataTableEnumOptionsInputSchema.safeParse(options);
	if (!input.success) {
		throw new DataTableValidationError(
			input.error.errors[0]?.message ?? 'Enum columns require options',
		);
	}

	const normalized = input.data.map((option, index) => ({
		id: typeof option === 'string' ? nanoid() : (option.id ?? nanoid()),
		text: (typeof option === 'string' ? option : option.text).trim(),
		color:
			typeof option === 'string'
				? getDefaultDataTableEnumColor(index)
				: (option.color ?? getDefaultDataTableEnumColor(index)),
	}));
	const result = dataTableEnumOptionsSchema.safeParse(normalized);
	if (!result.success) {
		throw new DataTableValidationError(result.error.errors[0]?.message ?? 'Invalid enum options');
	}
	return result.data;
}

export function normalizeColumn(
	column: DataTableCreateColumnSchema,
): NormalizedDataTableCreateColumn {
	if (column.type === 'enum') {
		const options = normalizeEnumOptions(column.options);
		const requestedDefault = column.defaultValue?.trim();
		const defaultOption =
			requestedDefault === undefined
				? undefined
				: options.find(
						(option) => option.id === requestedDefault || option.text === requestedDefault,
					);
		if (requestedDefault !== undefined && !defaultOption) {
			throw new DataTableValidationError('The enum default value must be one of its options');
		}

		return { ...column, options, defaultValue: defaultOption?.id };
	}

	if (column.options !== undefined || column.defaultValue !== undefined) {
		throw new DataTableValidationError('Only enum columns can define options or a default value');
	}

	return { ...column, options: undefined };
}

export function resolveEnumValue(
	value: DataTableColumnReturnJsType,
	column: Pick<DataTableColumn, 'type' | 'options'>,
): DataTableColumnReturnJsType {
	if (column.type !== 'enum' || typeof value !== 'string') return value;

	const option = column.options?.find((candidate) => candidate.id === value);
	return {
		id: value,
		value: option?.text ?? value,
		color: option?.color ?? '',
	};
}

export function resolveEnumRows(
	rows: DataTableRowReturn[],
	columns: DataTableColumn[],
): DataTableRowReturn[];
export function resolveEnumRows(
	rows: DataTableRowReturnWithState[],
	columns: DataTableColumn[],
): DataTableRowReturnWithState[];
export function resolveEnumRows(
	rows: Array<DataTableRowReturn | DataTableRowReturnWithState>,
	columns: DataTableColumn[],
): Array<DataTableRowReturn | DataTableRowReturnWithState> {
	const enumColumns = columns.filter((column) => column.type === 'enum');
	if (enumColumns.length === 0) return rows;

	return rows.map((row) => {
		const resolvedRow = { ...row };
		for (const column of enumColumns) {
			resolvedRow[column.name] = resolveEnumValue(row[column.name] ?? null, column);
		}
		return resolvedRow;
	});
}
