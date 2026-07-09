import type { BackendFilterRecord, FilterModel } from '../types/dataTableFilters.types';
import { mapTextTypeToBackend, mapNumberDateTypeToBackend } from './filterMappings';

export function processTextFilter(
	filter: FilterModel[string],
	colField: string,
): BackendFilterRecord {
	let value: string | number | boolean | Date | null = filter.filter ?? null;

	if (typeof filter.filter === 'string') {
		if (filter.type === 'startsWith') {
			value = `${filter.filter}%`;
		} else if (filter.type === 'endsWith') {
			value = `%${filter.filter}`;
		} else if (filter.type === 'contains') {
			// backend will auto-wrap to %value% if % not present
			value = filter.filter;
		}
	} else if (filter.type === 'isEmpty' || filter.type === 'notEmpty') {
		value = '';
	} else if (filter.type === 'null' || filter.type === 'notNull') {
		value = null;
	} else if (filter.type === 'true') {
		value = true;
	} else if (filter.type === 'false') {
		value = false;
	}

	return {
		columnName: colField,
		condition: mapTextTypeToBackend(filter.type),
		value,
	};
}

export function processNumberFilter(
	filter: FilterModel[string],
	colField: string,
): BackendFilterRecord[] {
	let value: string | number | boolean | Date | null = filter.filter ?? null;

	if (filter.type === 'between') {
		return [
			{
				columnName: colField,
				condition: 'gte',
				value: filter.filter ?? null,
			},
			{
				columnName: colField,
				condition: 'lte',
				value: filter.filterTo ?? null,
			},
		];
	}

	if (filter.type === 'null' || filter.type === 'notNull') {
		value = null;
	}

	return [
		{
			columnName: colField,
			condition: mapNumberDateTypeToBackend(filter.type),
			value,
		},
	];
}

export function processDateFilter(
	filter: FilterModel[string],
	colField: string,
): BackendFilterRecord[] {
	const filters: BackendFilterRecord[] = [];
	let value: string | number | boolean | Date | null = filter.filter ?? null;

	if (filter.type === 'null' || filter.type === 'notNull') {
		value = null;
		filters.push({
			columnName: colField,
			condition: mapNumberDateTypeToBackend(filter.type),
			value,
		});
	} else {
		if (filter.dateFrom) {
			value = new Date(String(filter.dateFrom)).toISOString();
		}

		if (filter.type === 'inRange') {
			if (filter.dateFrom && filter.dateTo) {
				const fromIso = new Date(String(filter.dateFrom)).toISOString();
				const toIso = new Date(String(filter.dateTo)).toISOString();
				filters.push({ columnName: colField, condition: 'gte', value: fromIso });
				filters.push({ columnName: colField, condition: 'lte', value: toIso });
			}
		} else {
			filters.push({
				columnName: colField,
				condition: mapNumberDateTypeToBackend(filter.type),
				value,
			});
		}
	}

	return filters;
}
