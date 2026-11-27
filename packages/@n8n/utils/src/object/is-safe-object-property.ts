/**
 * Names rejected for static and literal member access by the expression
 * transform, and for runtime-built keys by each engine's runtime sanitizer.
 */
export const unsafeObjectProperties: ReadonlySet<string> = new Set([
	'__proto__',
	'prototype',
	'constructor',
	'getPrototypeOf',
	'setPrototypeOf',
	'getOwnPropertyDescriptor',
	'getOwnPropertyDescriptors',
	'defineProperty',
	'defineProperties',
	'mainModule',
	'binding',
	'_linkedBinding',
	'_load',
	'prepareStackTrace',
	'__lookupGetter__',
	'__lookupSetter__',
	'__defineGetter__',
	'__defineSetter__',
	'caller',
	'callee',
	'arguments',
	'getBuiltinModule',
	'dlopen',
	'execve',
	'loadEnvFile',
]);

/**
 * Checks whether a property key is safe to use on an object.
 */
export function isSafeObjectProperty(property: string): boolean {
	return !unsafeObjectProperties.has(property);
}
