import type { DataGridColumnType } from './DataGrid.types';

const NUMBER_GROUPS_REGEX = /\B(?=(\d{3})+(?!\d))/g;
const LOOSE_DATE_REGEX =
	/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:[ T]([0-9]{1,2}):([0-9]{1,2})(?::([0-9]{1,2}))?)?$/;

const pad = (value: number, length = 2) => String(Math.abs(value)).padStart(length, '0');

const toTime = (value: unknown): number | undefined => {
	if (value instanceof Date) return value.getTime();
	if (typeof value === 'string') return Date.parse(value);
	return undefined;
};

export const areCellValuesEqual = (a: unknown, b: unknown, type: DataGridColumnType): boolean => {
	const left = a ?? null;
	const right = b ?? null;

	if (type === 'date') {
		const leftTime = toTime(left);
		const rightTime = toTime(right);
		if (leftTime !== undefined && rightTime !== undefined) {
			return leftTime === rightTime;
		}
	}

	return left === right;
};

export const toDate = (value: unknown): Date | null => {
	const time = toTime(value);
	return time === undefined || Number.isNaN(time) ? null : new Date(time);
};

export const toLocalDateTimeString = (date: Date) =>
	`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const toLocalIsoString = (date: Date) => {
	const offset = -date.getTimezoneOffset();
	const sign = offset >= 0 ? '+' : '-';
	const offsetText = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
	const time = toLocalDateTimeString(date).replace(' ', 'T');
	return `${time}.${pad(date.getMilliseconds(), 3)}${offsetText}`;
};

const formatNumber = (value: number) => {
	const [integer, fraction] = String(value).split('.');
	const grouped = integer.replace(NUMBER_GROUPS_REGEX, ' ');
	return fraction === undefined ? grouped : `${grouped}.${fraction}`;
};

export const toText = (value: unknown): string => {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		typeof value === 'bigint'
	) {
		return String(value);
	}
	return JSON.stringify(value) ?? '';
};

export const formatCellValue = (value: unknown, type: DataGridColumnType): string => {
	if (value === null || value === undefined) return '';
	if (type === 'number' && typeof value === 'number') return formatNumber(value);
	if (type === 'date') {
		const date = toDate(value);
		return date ? toLocalIsoString(date) : toText(value);
	}
	if (type === 'json') return JSON.stringify(value);
	return toText(value);
};

export const parsePastedValue = (text: string, type: DataGridColumnType): unknown => {
	switch (type) {
		case 'string':
			return text;
		case 'number': {
			const value = Number(text);
			return text.trim() === '' || Number.isNaN(value) ? undefined : value;
		}
		case 'date':
			return Number.isNaN(Date.parse(text)) ? undefined : new Date(text);
		case 'boolean': {
			const lower = text.trim().toLowerCase();
			if (lower === 'true') return true;
			if (lower === 'false') return false;
			return undefined;
		}
		case 'json':
			return undefined;
	}
};

export const parseLooseDate = (text: string): Date | null => {
	const match = LOOSE_DATE_REGEX.exec(text.trim());
	if (!match) return null;
	const [year, month, day, hours = 0, minutes = 0, seconds = 0] = match
		.slice(1)
		.map((part) => (part === undefined ? undefined : Number(part)));
	if (year === undefined || month === undefined || day === undefined) return null;

	const date = new Date(year, month - 1, day, hours, minutes, seconds, 0);
	const isSameDate =
		date.getFullYear() === year &&
		date.getMonth() === month - 1 &&
		date.getDate() === day &&
		date.getHours() === hours &&
		date.getMinutes() === minutes &&
		date.getSeconds() === seconds;
	return isSameDate ? date : null;
};
