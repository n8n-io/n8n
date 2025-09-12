import { LOOSE_DATE_REGEX } from '@/features/dataStore/constants';
import type { DataStoreColumnType } from '@/features/dataStore/datastore.types';

/**
 * Parses a loose date string into a Date object.
 * Allows:
 * 	- Missing leading zeros (e.g., 2023-7-9 5:6:7)
 * 	- Optional time part (e.g., 2023-07-09), defaulting to 00:00:00
 *  - Optional seconds part (e.g., 2023-07-09 05:06), defaulting to 00
 * 	- Extra whitespace around the date
 * @param text The loose date string to parse
 * @returns The parsed Date object, or null if parsing failed
 */
export const parseLooseDateInput = (text: string): Date | null => {
	const trimmed = text.trim();
	const m = LOOSE_DATE_REGEX.exec(trimmed);
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	const hh = m[4] !== undefined ? Number(m[4]) : 0;
	const mm = m[5] !== undefined ? Number(m[5]) : 0;
	const ss = m[6] !== undefined ? Number(m[6]) : 0;

	if (mo < 1 || mo > 12) return null;
	if (d < 1 || d > 31) return null;
	if (hh < 0 || hh > 23) return null;
	if (mm < 0 || mm > 59) return null;
	if (ss < 0 || ss > 59) return null;

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
 * @param type DataStoreColumnType | undefined
 * @returns boolean
 */
export const areValuesEqual = (
	oldValue: unknown,
	newValue: unknown,
	type: DataStoreColumnType | undefined,
) => {
	if (type && type === 'date') {
		if (oldValue instanceof Date && newValue instanceof Date) {
			return oldValue.getTime() === newValue.getTime();
		}
	}
	return oldValue === newValue;
};
