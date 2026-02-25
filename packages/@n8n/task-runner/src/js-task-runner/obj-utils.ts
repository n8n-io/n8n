export function isObject(maybe: unknown): maybe is object {
	return (
		typeof maybe === 'object' && maybe !== null && !Array.isArray(maybe) && !(maybe instanceof Date)
	);
}
