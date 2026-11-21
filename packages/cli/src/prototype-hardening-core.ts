/**
 * Keep this module free of configuration so worker threads can use the same policy.
 * String.prototype stays open because modules such as colors add getters to it.
 */
export function lockBuiltinPrototypes() {
	for (const prototype of [
		Object.prototype,
		Array.prototype,
		Function.prototype,
		Number.prototype,
		Boolean.prototype,
	]) {
		Object.preventExtensions(prototype);
	}
}
