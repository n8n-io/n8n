export function isObjectLiteral(item: unknown): item is { [key: string]: unknown } {
	return typeof item === 'object' && item !== null && !Array.isArray(item);
}
