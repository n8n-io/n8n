/**
 * Prepare a value for transfer across the V8 isolate boundary.
 *
 * isolated-vm's `copy: true` uses structured clone, which strips prototypes
 * from non-standard types. Luxon DateTime/Duration/Interval lose their class
 * identity and arrive on the host as plain objects.
 *
 * This function recursively walks a value and converts types that don't
 * survive structured clone into their string representations. It runs
 * inside the isolate before the result is transferred.
 *
 * Note: JS Date objects survive structured clone with prototype intact
 * (Date is a standard structured-cloneable type) and are not converted.
 *
 * Circular references are not handled — expression results should not
 * contain cycles.
 */
export function __prepareForTransfer(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value !== 'object') return value;

	// Luxon DateTime -> ISO string
	if ((value as any).isLuxonDateTime) return (value as any).toISO();
	// Luxon Duration -> ISO string (e.g., "PT1H30M")
	if ((value as any).isLuxonDuration) return (value as any).toISO();
	// Luxon Interval -> ISO string (e.g., "2024-01-01T00:00/2024-01-02T00:00")
	if ((value as any).isLuxonInterval) return (value as any).toISO();

	// Array — walk elements
	if (Array.isArray(value)) return value.map(__prepareForTransfer);

	// Only walk plain objects — structured-cloneable types like Date, Map, Set,
	// RegExp, Error, typed arrays survive copy:true with prototypes intact.
	const proto = Object.getPrototypeOf(value);
	if (proto !== Object.prototype && proto !== null) return value;

	// Plain object — walk values
	const result: Record<string, unknown> = {};
	for (const key of Object.keys(value)) {
		result[key] = __prepareForTransfer((value as any)[key]);
	}
	return result;
}
