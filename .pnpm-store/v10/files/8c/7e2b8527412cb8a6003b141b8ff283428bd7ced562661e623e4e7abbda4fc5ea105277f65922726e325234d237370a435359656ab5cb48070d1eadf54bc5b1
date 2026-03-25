export function toArray<T>(obj: T): T extends unknown[] ? T : T[] {
	if (Array.isArray(obj)) {
		return obj as T extends unknown[] ? T : T[];
	}
	return [obj] as T extends unknown[] ? T : T[];
}
