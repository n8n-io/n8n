export function isIterator(obj: unknown): boolean {
	return obj instanceof Object && Symbol.iterator in obj;
}
