import { LOOSE_DATE_REGEX } from '@/features/dataTable/constants';
import type { DataTableColumnType } from '@/features/dataTable/dataTable.types';

/**
 * Parses a loose date string into a Date object.
 * Allows:
 * 	- Missing leading zeros (e.g., 2023-7-9 5:6:7)
 * 	- Optional time part (e.g., 2023-07-09), defaulting to 00:00:00
 *  - Optional seconds part (e.g., 2023-07-09 05:06), defaulting to 00
 * @param text The loose date string to parse
 * @returns Date | null
 */
export const parseLooseDateInput = (text: string): Date | null => {
	const trimmed = text.trim();
	// Validate shape and extract parts
	const m = LOOSE_DATE_REGEX.exec(trimmed);
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	const hh = m[4] !== undefined ? Number(m[4]) : 0;
	const mm = m[5] !== undefined ? Number(m[5]) : 0;
	const ss = m[6] !== undefined ? Number(m[6]) : 0;

	// Check if constructed date matches input parts
	// this ensures Date constructor didn't auto-correct invalid dates
	const dt = new Date(y, mo - 1, d, hh, mm, ss, 0);
	if (
		dt.getFullYear() !== y ||
		dt.getMonth() !== mo - 1 ||
		dt.getDate() !== d ||
		dt.getHours() !== hh ||
		dt.getMinutes() !== mm ||
		dt.getSeconds() !== ss
	) {
		return null;
	}

	return dt;
};

/**
 * Check if two column values are equal, with special handling for date types.
 * @param oldValue unknown
 * @param newValue unknown
 * @param type DataTableColumnType | undefined
 * @returns boolean
 */
export const areValuesEqual = (
	oldValue: unknown,
	newValue: unknown,
	type: DataTableColumnType | undefined,
) => {
	if (type && type === 'date') {
		if (oldValue instanceof Date && newValue instanceof Date) {
			return oldValue.getTime() === newValue.getTime();
		}
	}
	return oldValue === newValue;
};
