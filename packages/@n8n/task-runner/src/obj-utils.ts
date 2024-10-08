export function isObject(maybe: unknown): maybe is { [key: string]: unknown } {
	return (
		typeof maybe === 'object' && maybe !== null && !Array.isArray(maybe) && !(maybe instanceof Date)
	);
}
