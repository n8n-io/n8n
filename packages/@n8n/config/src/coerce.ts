/** Parse a string env value to a number. Returns `undefined` if parsing fails. */
export function toNumber(value: string): number | undefined {
	const parsed = Number(value);
	return isNaN(parsed) ? undefined : parsed;
}

/** Parse a string env value to a boolean. Returns `undefined` if parsing fails. */
export function toBoolean(value: string): boolean | undefined {
	const lower = value.toLowerCase();
	if (['true', '1'].includes(lower)) return true;
	if (['false', '0'].includes(lower)) return false;
	return undefined;
}

/** Parse a string env value to a Date. Returns `undefined` if parsing fails. */
export function toDate(value: string): Date | undefined {
	const timestamp = Date.parse(value);
	return isNaN(timestamp) ? undefined : new Date(timestamp);
}

/** Trim whitespace and strip surrounding quotes from a string env value. */
export function toString(value: string): string {
	return value.trim().replace(/^(['"])(.*)\1$/, '$2');
}
