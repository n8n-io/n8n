import { EventEmitter } from 'node:events';

const isFreezable = (value: unknown): value is object =>
	value !== null && (typeof value === 'object' || typeof value === 'function');

/**
 * `EventEmitter.prototype` members that user code must not override.
 * `process` inherits these from `EventEmitter.prototype`.
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
			// eslint-disable-next-line @typescript-eslint/unbound-method -- reinstalled as a property, not called here
			value: EventEmitter.prototype[method],
			writable: false,
			configurable: false,
			enumerable: true,
		});
	}
};

/**
 * Prototypes the walk leaves extensible, guarded by {@link lockEventEmitterMethods} instead.
 * Node copies these method names onto stream subclass prototypes, so a freeze breaks those assignments.
 */
const METHOD_LOCKED_PROTOTYPES: readonly object[] = [EventEmitter.prototype];

type IteratorWithHelpers = { map: (fn: (value: unknown) => unknown) => object };

const hasIteratorHelpers = (value: unknown): value is IteratorWithHelpers =>
	isFreezable(value) && typeof Reflect.get(value, 'map') === 'function';

/** Prototypes no `globalThis` name leads to: only calling a global produces a value that carries them. */
const unreachablePrototypes = () => {
	const timeout = setTimeout(() => {}, 0);
	clearTimeout(timeout);

	const immediate = setImmediate(() => {});
	clearImmediate(immediate);

	function* generatorFunction() {}
	async function* asyncGeneratorFunction() {}
	async function asyncFunction() {}

	// Guarded rather than called directly, because the TypeScript lib in use does not type iterator helpers.
	const arrayIterator: unknown = [].values();
	const iteratorHelper = hasIteratorHelpers(arrayIterator)
		? [arrayIterator.map((value) => value)]
		: [];

	return [
		timeout,
		immediate,
		generatorFunction,
		asyncGeneratorFunction,
		asyncFunction,
		[][Symbol.iterator](),
		''[Symbol.iterator](),
		new Map()[Symbol.iterator](),
		new Set()[Symbol.iterator](),
		new FormData().entries(),
		...iteratorHelper,
	].map((value) => Object.getPrototypeOf(value) as unknown);
};

const collectPrototypeChain = (value: unknown, collected: Set<object>) => {
	let current: unknown = value;

	while (isFreezable(current) && !collected.has(current)) {
		collected.add(current);
		current = Object.getPrototypeOf(current);
	}
};

/**
 * Freeze the globals and shared prototypes reachable from sandboxed code so it
 * cannot mutate them to escape secure mode.
 * Walks the prototype chain of each root, so intrinsics with no binding of
 * their own, such as `%TypedArray%.prototype`, are covered too.
 * Skip in tests, where Vitest needs to mutate prototypes.
 */
export const freezeGlobals = () => {
	const globalFunctions: unknown[] = Object.getOwnPropertyNames(globalThis)
		.map((name) => Reflect.get(globalThis, name) as unknown)
		.filter((value) => typeof value === 'function');

	const roots = [...globalFunctions, ...unreachablePrototypes()];

	const collected = new Set<object>();

	for (const root of roots) {
		collectPrototypeChain(root, collected);
		if (isFreezable(root)) collectPrototypeChain(Reflect.get(root, 'prototype'), collected);
	}

	for (const prototype of METHOD_LOCKED_PROTOTYPES) {
		collected.delete(prototype);
	}

	collected.forEach(Object.freeze);

	[Reflect, JSON, Math].forEach(Object.freeze);

	lockEventEmitterMethods();
};
