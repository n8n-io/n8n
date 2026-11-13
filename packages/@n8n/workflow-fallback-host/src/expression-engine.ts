/**
 * The expression engine of the fallback host.
 *
 * n8n gives each execution its own isolate and disposes it at the end. In
 * the host, one execution is one step, so that costs a new isolate and a new
 * load of the runtime bundle for each step: about 30 ms of CPU. The host
 * keeps one isolate for each process instead:
 *
 * - Native evaluation runs the expressions of the native subset in the
 *   process, without an isolate. Most steps need no isolate.
 * - Lazy acquisition makes the isolate only when the first expression
 *   outside the subset arrives.
 * - The shared caller gives every step the same isolate.
 *
 * A step must not change what a later step sees. The sandbox already blocks
 * the prototypes (`prototype`, `__proto__`, `getPrototypeOf`) and the real
 * global object. When the host makes an isolate, it locks the rest
 * (`LOCKDOWN_SOURCE`): it removes the legacy `RegExp` match properties and
 * freezes the global object and each object that it can reach through own
 * properties, except the targets of the sandbox proxies, which it makes
 * read-only in a different way. Each evaluation builds a new data context and the bridge
 * disposes it after the call, so no item data stays in the isolate.
 *
 * If the isolate dies (memory limit), the host makes a new one for the next
 * step (`recoverExpressionEngine`).
 */
import { createRequire } from 'node:module';
import { Expression, UnexpectedError } from 'n8n-workflow';

/**
 * Runs once in each new isolate context, after the runtime bundle and the
 * error handler. It skips the prototype and caller keys because the sandbox
 * blocks them and freezing them breaks assignments to instance properties
 * that a prototype also defines.
 *
 * Expressions see `Object` and the error classes through proxies
 * (SafeObject, SafeError and the subclass wrappers) whose `get` returns a
 * wrapper function. A proxy must not do that for a frozen property of its
 * target, so the walk does not freeze these targets. It changes each of
 * their properties to a fixed getter that cannot be deleted, and stops new
 * properties. `Error.stackTraceLimit` stays a data property, because V8
 * reads it, and becomes read-only.
 */
const LOCKDOWN_SOURCE = `(function () {
	var legacy = ['input', '$_', 'lastMatch', '$&', 'lastParen', '$+', 'leftContext', '$\`',
		'rightContext', "$'", '$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8', '$9'];
	for (var i = 0; i < legacy.length; i++) delete RegExp[legacy[i]];
	var skip = { prototype: 1, constructor: 1, __proto__: 1, caller: 1, callee: 1, arguments: 1 };
	var seen = new WeakSet();
	var setters = [];
	function lock(value, path) {
		if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return;
		if (seen.has(value)) return;
		seen.add(value);
		lockMembers(value, path);
		Object.freeze(value);
	}
	function lockMembers(value, path) {
		var keys = Reflect.ownKeys(value);
		for (var k = 0; k < keys.length; k++) {
			if (typeof keys[k] === 'string' && skip[keys[k]]) continue;
			var descriptor = Object.getOwnPropertyDescriptor(value, keys[k]);
			if (!descriptor) continue;
			if (descriptor.set) setters.push(path + '.' + String(keys[k]));
			if ('value' in descriptor) lock(descriptor.value, path + '.' + String(keys[k]));
		}
	}
	function fixed(value) {
		return function () { return value; };
	}
	function guard(target, path) {
		seen.add(target);
		lockMembers(target, path);
		var keys = Reflect.ownKeys(target);
		for (var k = 0; k < keys.length; k++) {
			var descriptor = Object.getOwnPropertyDescriptor(target, keys[k]);
			if (!descriptor.configurable) continue;
			if (keys[k] === 'stackTraceLimit') {
				Object.defineProperty(target, keys[k], { writable: false, configurable: false });
			} else if ('value' in descriptor) {
				Object.defineProperty(target, keys[k], {
					get: fixed(descriptor.value), enumerable: descriptor.enumerable, configurable: false,
				});
			}
		}
		Object.preventExtensions(target);
	}
	seen.add(SafeObject);
	seen.add(SafeError);
	var proxied = [Object, Error, TypeError, SyntaxError, EvalError, RangeError, ReferenceError, URIError];
	for (var p = 0; p < proxied.length; p++) guard(proxied[p], proxied[p].name);
	lock(globalThis, 'globalThis');
	return setters.join(',');
})()`;

interface ContextLike {
	evalSync(code: string): unknown;
}

interface BridgePrototype {
	initialize(): Promise<void>;
	initializeSync(): void;
}

function isContextLike(value: unknown): value is ContextLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof Reflect.get(value, 'evalSync') === 'function'
	);
}

function isBridgePrototype(value: unknown): value is BridgePrototype {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof Reflect.get(value, 'initialize') === 'function' &&
		typeof Reflect.get(value, 'initializeSync') === 'function'
	);
}

/** Locks the context of a bridge that has just started. */
function lockDown(bridge: object): void {
	const context: unknown = Reflect.get(bridge, 'context');
	if (!isContextLike(context)) {
		throw new UnexpectedError('The expression bridge has no context to lock');
	}
	const setters = context.evalSync(LOCKDOWN_SOURCE);
	// A setter can keep state that freezing does not stop. The runtime has none today.
	if (setters !== '') {
		throw new UnexpectedError('The expression isolate has global setters', {
			extra: { setters },
		});
	}
}

let patched = false;

/**
 * Makes every new isolated-vm bridge lock its context when it starts. The
 * bridge class comes from the copy of `@n8n/expression-runtime` that
 * n8n-workflow loads, so the patch applies to the bridges it makes.
 */
function patchBridge(): void {
	if (patched) return;
	const runtimeRequire = createRequire(require.resolve('n8n-workflow'));
	const runtime: unknown = runtimeRequire('@n8n/expression-runtime');
	const bridgeClass: unknown =
		typeof runtime === 'object' && runtime !== null
			? Reflect.get(runtime, 'IsolatedVmBridge')
			: undefined;
	const proto: unknown =
		typeof bridgeClass === 'function' ? Reflect.get(bridgeClass, 'prototype') : undefined;
	if (!isBridgePrototype(proto)) {
		throw new UnexpectedError('Cannot find the isolated-vm expression bridge');
	}
	const { initialize, initializeSync } = proto;
	proto.initialize = async function (this: BridgePrototype) {
		await initialize.call(this);
		lockDown(this);
	};
	proto.initializeSync = function (this: BridgePrototype) {
		initializeSync.call(this);
		lockDown(this);
	};
	patched = true;
}

let engine: Promise<void> | undefined;

/** Starts the engine once for each process. */
export async function ensureExpressionEngine(): Promise<void> {
	engine ??= (async () => {
		patchBridge();
		await Expression.initExpressionEngine({
			engine: 'vm',
			poolSize: 1,
			maxCodeCacheSize: 1024,
			bridgeTimeout: 5000,
			bridgeMemoryLimit: 128,
			sharedCaller: true,
			lazyAcquire: true,
			compileCache: true,
			nativeEvaluation: true,
		});
	})();
	try {
		await engine;
	} catch (error) {
		engine = undefined;
		throw error;
	}
}

export async function disposeExpressionEngine(): Promise<void> {
	if (engine === undefined) return;
	engine = undefined;
	await Expression.disposeExpressionEngine();
}

/** Errors after which the shared isolate is gone. */
const DEAD_ISOLATE = /no longer available|memory limit|isolate was disposed|Isolate is disposed/i;

/**
 * Replaces the shared isolate after a step killed it, so that later steps
 * do not fail.
 */
export async function recoverExpressionEngine(error: unknown): Promise<void> {
	const message = error instanceof Error ? error.message : String(error);
	if (!DEAD_ISOLATE.test(message)) return;
	await disposeExpressionEngine();
}
