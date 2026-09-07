/**
 * Type guard: narrows `key` to `keyof T` when it is a real own (non-inherited)
 * string key of `object`. Used in `Proxy` `get`/`has` traps to route on a
 * registry of known property names without resorting to `as keyof T` casts.
 *
 * Uses `Object.hasOwn` rather than the `in` operator so prototype-chain
 * properties (`toString`, `constructor`, `hasOwnProperty`, ...) do NOT pass
 * the guard. Otherwise a synthetic `Proxy` would treat `obj.toString` as a
 * registered method and route it through whatever the trap dispatches on,
 * producing a malformed envelope and breaking the user-visible fallthrough.
 *
 * Parameter order matches the `Object.hasOwn(obj, key)` / `Reflect.has(obj, key)`
 * convention from the standard library.
 */
export function isKeyOf<T extends object>(object: T, key: PropertyKey): key is keyof T {
	return typeof key !== 'symbol' && Object.hasOwn(object, key);
}
