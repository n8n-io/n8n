/**
 * Freezes a value and every nested object and array, and returns the same reference.
 * It also visits the children of an object that is already frozen, and it ends cycles.
 * Use it for plain data: it throws on typed arrays with elements and on Vue reactive
 * proxies with object children, and it does not freeze `Map`, `Set`, or `Date` contents.
 */
export function deepFreeze<T>(value: T): T {
	const visited = new WeakSet<object>();

	function freeze(current: unknown) {
		if (current === null || typeof current !== 'object' || visited.has(current)) return;
		visited.add(current);
		Object.freeze(current);
		for (const child of Object.values(current)) freeze(child);
	}

	freeze(value);
	return value;
}
