import type { DataTableCreateColumnSchema } from '@n8n/api-types';

import { DataTableValidationError } from './errors/data-table-validation.error';

export function normalizeEnumOptions(options: string[] | undefined): string[] {
	if (!options) {
		throw new DataTableValidationError('Enum columns require options');
	}

	const normalized = options.map((option) => option.trim()).filter((option) => option.length > 0);
	if (normalized.length < 1 || normalized.length > 100) {
		throw new DataTableValidationError('Enum columns require between 1 and 100 options');
	}

	const seen = new Set<string>();
	for (const option of normalized) {
		if (option.length > 128) {
			throw new DataTableValidationError('Enum options cannot exceed 128 characters');
		}
		if (option.includes(',')) {
			throw new DataTableValidationError('Enum options cannot contain commas');
		}

		const key = option.toLowerCase();
		if (seen.has(key)) {
			throw new DataTableValidationError('Enum options must be unique, ignoring case');
		}
		seen.add(key);
	}

	return normalized;
}

export function normalizeColumn(column: DataTableCreateColumnSchema): DataTableCreateColumnSchema {
	if (column.type === 'enum') {
		const options = normalizeEnumOptions(column.options);
		const defaultValue = column.defaultValue?.trim();
		if (defaultValue !== undefined && !options.includes(defaultValue)) {
			throw new DataTableValidationError('The enum default value must be one of its options');
		}

		return { ...column, options, defaultValue };
	}

	if (column.options !== undefined || column.defaultValue !== undefined) {
		throw new DataTableValidationError('Only enum columns can define options or a default value');
	}

	return column;
}
