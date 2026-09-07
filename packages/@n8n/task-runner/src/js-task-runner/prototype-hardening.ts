import { EventEmitter } from 'node:events';

type FunctionWithPrototype = ((...args: unknown[]) => unknown) & {
	prototype?: object;
};

const isFreezable = (value: unknown): value is object =>
	typeof value === 'object' || typeof value === 'function';

/** Freeze a function and its prototype. */
const freezeFunctionAndPrototype = (fn: FunctionWithPrototype) => {
	if (isFreezable(fn.prototype)) {
		Object.freeze(fn.prototype);
	}
	Object.freeze(fn);
};

/**
 * `EventEmitter.prototype` members that user code must not override.
 * `process` inherits these from `EventEmitter.prototype`,
 * which lives in an internal module and never appears on `globalThis`,
 * so the global freeze misses it.
 */
const PROTECTED_EVENT_EMITTER_METHODS = [
	'emit',
	'on',
	'once',
	'addListener',
	'prependListener',
	'prependOnceListener',
] as const;

/**
 * Lock {@link PROTECTED_EVENT_EMITTER_METHODS} against reassignment.
 * Locked individually rather than by freezing the prototype,
 * because Node lazily copies these names onto stream subclass prototypes (`net`, `tls`, `http`, etc)
 * and a wholesale freeze breaks those assignments.
 * Kept enumerable to match Node's default, so hiding them from `for...in`,
 * `Object.keys` and spreads does not alter every emitter in the process.
 */
const lockEventEmitterMethods = () => {
	for (const method of PROTECTED_EVENT_EMITTER_METHODS) {
		Object.defineProperty(EventEmitter.prototype, method, {
			value: EventEmitter.prototype[method],
			writable: false,
			configurable: false,
			enumerable: true,
		});
	}
};

/**
 * Freeze the globals and shared prototypes reachable from sandboxed code so it
 * cannot mutate them to escape secure mode.
 * Skip in tests, where Vitest needs to mutate prototypes.
 */
export const freezeGlobals = () => {
	Object.getOwnPropertyNames(globalThis)
		.map((name) => Reflect.get(globalThis, name) as unknown)
		.filter((value): value is FunctionWithPrototype => typeof value === 'function')
		.forEach(freezeFunctionAndPrototype);

	[Reflect, JSON, Math].forEach(Object.freeze);

	lockEventEmitterMethods();
};
