/**
 * Type guard: narrows `key` to `keyof T` when it is a real own/inherited
 * string key of `object`. Used in `Proxy` `get`/`has` traps to route on a
 * registry of known property names without resorting to `as keyof T` casts.
 *
 * Parameter order matches the `Object.hasOwn(obj, key)` / `Reflect.has(obj, key)`
 * convention from the standard library.
 */
export function isKeyOf<T extends object>(object: T, key: PropertyKey): key is keyof T {
	return typeof key !== 'symbol' && key in object;
}
