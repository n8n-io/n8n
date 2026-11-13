/**
 * Maps the values of a record. Returns the same record when `fn` changes no
 * value, so consumers that gate on identity see no change.
 */
export function mapRecord<T>(record: Record<string, T>, fn: (value: T) => T): Record<string, T> {
	let changed = false;
	const next = Object.fromEntries(
		Object.entries(record).map(([key, value]) => {
			const mapped = fn(value);
			if (mapped !== value) changed = true;
			return [key, mapped];
		}),
	);
	return changed ? next : record;
}
