export function ensureArray <T>(a: T | T[]): T[] {
	return Array.isArray(a) ? a : [a]
}
