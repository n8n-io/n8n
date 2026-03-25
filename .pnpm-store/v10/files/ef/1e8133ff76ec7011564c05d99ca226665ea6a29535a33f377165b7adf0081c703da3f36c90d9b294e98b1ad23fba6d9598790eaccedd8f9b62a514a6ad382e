/* global host, bridge, data, context */

'use strict';

const {
	Object: localObject,
	Array: localArray,
	Error: LocalError,
	Reflect: localReflect,
	Proxy: LocalProxy,
	WeakMap: LocalWeakMap,
	Function: localFunction,
	eval: localEval
} = global;

const {
	freeze: localObjectFreeze
} = localObject;

const {
	getPrototypeOf: localReflectGetPrototypeOf,
	apply,
	construct: localReflectConstruct,
	deleteProperty: localReflectDeleteProperty,
	has: localReflectHas,
	defineProperty: localReflectDefineProperty,
	setPrototypeOf: localReflectSetPrototypeOf,
	getOwnPropertyDescriptor: localReflectGetOwnPropertyDescriptor,
	ownKeys: localReflectOwnKeys
} = localReflect;

const localObjectGetOwnPropertySymbols = localObject.getOwnPropertySymbols;
const localObjectGetOwnPropertyDescriptors = localObject.getOwnPropertyDescriptors;
const localObjectAssign = localObject.assign;

const speciesSymbol = Symbol.species;
const globalPromise = global.Promise;
class localPromise extends globalPromise {}

/*
 * Symbol.for protection
 *
 * Certain Node.js cross-realm symbols can be exploited for sandbox escapes:
 *
 * - 'nodejs.util.inspect.custom': Called by util.inspect with host's inspect function as argument.
 *   If sandbox defines this on an object passed to host APIs (e.g., WebAssembly.compileStreaming),
 *   Node's error handling calls the custom function with host context, enabling escape.
 *
 * - 'nodejs.rejection': Called by EventEmitter on promise rejection with captureRejections enabled.
 *   The handler receives error objects that could potentially leak host context.
 *
 * Fix: Override Symbol.for to return sandbox-local symbols for dangerous keys instead of cross-realm
 * symbols. This prevents Node.js internals from recognizing sandbox-defined symbol properties while
 * preserving cross-realm behavior for other symbols.
 */
const originalSymbolFor = Symbol.for;
const blockedSymbolCustomInspect = Symbol('nodejs.util.inspect.custom');
const blockedSymbolRejection = Symbol('nodejs.rejection');

Symbol.for = function(key) {
	// Convert to string once to prevent toString/toPrimitive bypass and TOCTOU attacks
	const keyStr = '' + key;
	if (keyStr === 'nodejs.util.inspect.custom') {
		return blockedSymbolCustomInspect;
	}
	if (keyStr === 'nodejs.rejection') {
		return blockedSymbolRejection;
	}
	return originalSymbolFor(keyStr);
};

/*
 * Cross-realm symbol extraction protection
 *
 * Even with Symbol.for overridden, cross-realm symbols can be extracted from
 * host objects exposed to the sandbox (e.g., Buffer.prototype) via:
 *   Object.getOwnPropertySymbols(Buffer.prototype).find(s => s.description === 'nodejs.util.inspect.custom')
 *
 * Fix: Override Object.getOwnPropertySymbols and Reflect.ownKeys to replace
 * dangerous cross-realm symbols with sandbox-local equivalents in results.
 */
const realSymbolCustomInspect = originalSymbolFor('nodejs.util.inspect.custom');
const realSymbolRejection = originalSymbolFor('nodejs.rejection');

function isDangerousSymbol(sym) {
	return sym === realSymbolCustomInspect || sym === realSymbolRejection;
}

localObject.getOwnPropertySymbols = function getOwnPropertySymbols(obj) {
	const symbols = apply(localObjectGetOwnPropertySymbols, localObject, [obj]);
	const result = [];
	let j = 0;
	for (let i = 0; i < symbols.length; i++) {
		if (typeof symbols[i] !== 'symbol' || !isDangerousSymbol(symbols[i])) {
			localReflectDefineProperty(result, j++, {
				__proto__: null,
				value: symbols[i],
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
	}
	return result;
};

localReflect.ownKeys = function ownKeys(obj) {
	const keys = apply(localReflectOwnKeys, localReflect, [obj]);
	const result = [];
	let j = 0;
	for (let i = 0; i < keys.length; i++) {
		if (typeof keys[i] !== 'symbol' || !isDangerousSymbol(keys[i])) {
			localReflectDefineProperty(result, j++, {
				__proto__: null,
				value: keys[i],
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
	}
	return result;
};

/*
 * Object.getOwnPropertyDescriptors uses the internal [[OwnPropertyKeys]] which
 * bypasses our Reflect.ownKeys override. The result object has dangerous symbols
 * as property keys, which can then be leaked via Object.assign/Object.defineProperties
 * to a Proxy whose set/defineProperty trap captures the key.
 */
localObject.getOwnPropertyDescriptors = function getOwnPropertyDescriptors(obj) {
	const descs = apply(localObjectGetOwnPropertyDescriptors, localObject, [obj]);
	localReflectDeleteProperty(descs, realSymbolCustomInspect);
	localReflectDeleteProperty(descs, realSymbolRejection);
	return descs;
};

/*
 * Object.assign uses internal [[OwnPropertyKeys]] on source objects, bypassing our
 * Reflect.ownKeys override. If a source (bridge proxy) has an enumerable dangerous-symbol
 * property, the symbol is passed to the target's [[Set]] which could be a user Proxy trap.
 */
localObject.assign = function assign(target) {
	if (target === null || target === undefined) {
		throw new LocalError('Cannot convert undefined or null to object');
	}
	const to = localObject(target);
	for (let s = 1; s < arguments.length; s++) {
		const source = arguments[s];
		if (source === null || source === undefined) continue;
		const from = localObject(source);
		const keys = apply(localReflectOwnKeys, localReflect, [from]);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			if (typeof key === 'symbol' && isDangerousSymbol(key)) continue;
			const desc = apply(localReflectGetOwnPropertyDescriptor, localReflect, [from, key]);
			if (desc && desc.enumerable === true) {
				to[key] = from[key];
			}
		}
	}
	return to;
};

const resetPromiseSpecies = (p) => {
	// Note: We do not use instanceof to check if p is a Promise because
	// Reflect.construct(Promise, [...], FakeNewTarget) can create a real Promise
	// (with internal slots) whose prototype does not include globalPromise.prototype,
	// bypassing the instanceof check entirely.
	//
	// Instead, we unconditionally set the constructor property on any object.
	// This ensures species resolution always uses localPromise, regardless of
	// how the promise was constructed.
	if (p !== null && (typeof p === 'object' || typeof p === 'function')) {
		// Always define an own data property for 'constructor' to eliminate
		// any TOCTOU vulnerability. Accessor properties (getters) on either the
		// instance or anywhere in the prototype chain can return different values
		// on each access, allowing an attacker to pass our check on the first read
		// while V8 internally sees a malicious species on subsequent reads.
		let success;
		try {
			success = localReflectDefineProperty(p, 'constructor', { __proto__: null, value: localPromise, writable: true, configurable: true });
		} catch (e) {
			// If defineProperty throws (e.g., Proxy with throwing trap), treat as failure
			success = false;
		}
		if (!success) {
			throw new LocalError('Unsafe Promise species cannot be reset');
		}
	}
};

const globalPromiseThen = globalPromise.prototype.then;
const globalPromiseCatch = globalPromise.prototype.catch;

globalPromise.prototype.then = function then(onFulfilled, onRejected) {
	resetPromiseSpecies(this);
	if (typeof onFulfilled === 'function') {
		const origOnFulfilled = onFulfilled;
		onFulfilled = function onFulfilled(value) {
			value = ensureThis(value);
			return apply(origOnFulfilled, this, [value]);
		};
	}
	if (typeof onRejected === 'function') {
		const origOnRejected = onRejected;
		onRejected = function onRejected(error) {
			error = handleException(error);
			return apply(origOnRejected, this, [error]);
		};
	}
	return apply(globalPromiseThen, this, [onFulfilled, onRejected]);
};

globalPromise.prototype.catch = function _catch(onRejected) {
	resetPromiseSpecies(this);
	if (typeof onRejected === 'function') {
		const origOnRejected = onRejected;
		onRejected = function onRejected(error) {
			error = handleException(error);
			return apply(origOnRejected, this, [error]);
		};
	}
	return apply(globalPromiseCatch, this, [onRejected]);
};

const localReflectApply = (target, thisArg, args) => {
	resetPromiseSpecies(thisArg);
	return apply(target, thisArg, args);
};

const {
	isArray: localArrayIsArray
} = localArray;

const {
	ensureThis,
	ReadOnlyHandler,
	from,
	fromWithFactory,
	readonlyFactory,
	connect,
	addProtoMapping,
	VMError,
	ReadOnlyMockHandler
} = bridge;

const {
	allowAsync,
	GeneratorFunction,
	AsyncFunction,
	AsyncGeneratorFunction
} = data;

const {
	get: localWeakMapGet,
	set: localWeakMapSet
} = LocalWeakMap.prototype;

function localUnexpected() {
	return new VMError('Should not happen');
}

// global is originally prototype of host.Object so it can be used to climb up from the sandbox.
if (!localReflectSetPrototypeOf(context, localObject.prototype)) throw localUnexpected();

Object.defineProperties(global, {
	global: {value: global, writable: true, configurable: true, enumerable: true},
	globalThis: {value: global, writable: true, configurable: true},
	GLOBAL: {value: global, writable: true, configurable: true},
	root: {value: global, writable: true, configurable: true},
	Error: {value: LocalError},
	Promise: {value: localPromise},
	Proxy: {value: undefined}
});

/*
 * WebAssembly.JSTag protection
 *
 * WebAssembly.JSTag (Node 25+) allows wasm exception handling to catch JavaScript
 * exceptions via try_table/catch with JSTag. This completely bypasses the transformer's
 * catch block instrumentation, which only wraps JavaScript catch clauses with
 * handleException(). An attacker can:
 *   1. Create a wasm module that imports JSTag and catches JS exceptions
 *   2. Import a function that triggers a host TypeError (e.g., via Symbol() name trick)
 *   3. Catch the host error in wasm, returning it as an externref
 *   4. Use the raw host error's constructor chain to escape
 *
 * Fix: Remove WebAssembly.JSTag from the sandbox. Without it, wasm code cannot
 * catch JavaScript exceptions — catch_all provides no value access, and catch_all_ref
 * requires JSTag for exn.extract. The tag is a V8 internal and cannot be reconstructed.
 */
if (typeof WebAssembly !== 'undefined' && WebAssembly.JSTag !== undefined) {
	localReflectDeleteProperty(WebAssembly, 'JSTag');
}

if (!localReflectDefineProperty(global, 'VMError', {
	__proto__: null,
	value: VMError,
	writable: true,
	enumerable: false,
	configurable: true
})) throw localUnexpected();

// Fixes buffer unsafe allocation
/* eslint-disable no-use-before-define */
class BufferHandler extends ReadOnlyHandler {

	apply(target, thiz, args) {
		if (args.length > 0 && typeof args[0] === 'number') {
			return LocalBuffer.alloc(args[0]);
		}
		return localReflectApply(LocalBuffer.from, LocalBuffer, args);
	}

	construct(target, args, newTarget) {
		if (args.length > 0 && typeof args[0] === 'number') {
			return LocalBuffer.alloc(args[0]);
		}
		return localReflectApply(LocalBuffer.from, LocalBuffer, args);
	}

}
/* eslint-enable no-use-before-define */

const LocalBuffer = fromWithFactory(obj => new BufferHandler(obj), host.Buffer);


if (!localReflectDefineProperty(global, 'Buffer', {
	__proto__: null,
	value: LocalBuffer,
	writable: true,
	enumerable: false,
	configurable: true
})) throw localUnexpected();

addProtoMapping(LocalBuffer.prototype, host.Buffer.prototype, 'Uint8Array');

/**
 *
 * @param {*} size Size of new buffer
 * @this LocalBuffer
 * @return {LocalBuffer}
 */
function allocUnsafe(size) {
	return LocalBuffer.alloc(size);
}

connect(allocUnsafe, host.Buffer.allocUnsafe);

/**
 *
 * @param {*} size Size of new buffer
 * @this LocalBuffer
 * @return {LocalBuffer}
 */
function allocUnsafeSlow(size) {
	return LocalBuffer.alloc(size);
}

connect(allocUnsafeSlow, host.Buffer.allocUnsafeSlow);

/**
 * Replacement for Buffer inspect
 *
 * @param {*} recurseTimes
 * @param {*} ctx
 * @this LocalBuffer
 * @return {string}
 */
function inspect(recurseTimes, ctx) {
	// Mimic old behavior, could throw but didn't pass a test.
	const max = host.INSPECT_MAX_BYTES;
	const actualMax = Math.min(max, this.length);
	const remaining = this.length - max;
	let str = this.hexSlice(0, actualMax).replace(/(.{2})/g, '$1 ').trim();
	if (remaining > 0) str += ` ... ${remaining} more byte${remaining > 1 ? 's' : ''}`;
	return `<${this.constructor.name} ${str}>`;
}

connect(inspect, host.Buffer.prototype.inspect);

connect(localFunction.prototype.bind, host.Function.prototype.bind);

connect(localObject.prototype.__defineGetter__, host.Object.prototype.__defineGetter__);
connect(localObject.prototype.__defineSetter__, host.Object.prototype.__defineSetter__);
connect(localObject.prototype.__lookupGetter__, host.Object.prototype.__lookupGetter__);
connect(localObject.prototype.__lookupSetter__, host.Object.prototype.__lookupSetter__);

/*
 * PrepareStackTrace sanitization
 */

const oldPrepareStackTraceDesc = localReflectGetOwnPropertyDescriptor(LocalError, 'prepareStackTrace');

let currentPrepareStackTrace = LocalError.prepareStackTrace;
const wrappedPrepareStackTrace = new LocalWeakMap();
if (typeof currentPrepareStackTrace === 'function') {
	wrappedPrepareStackTrace.set(currentPrepareStackTrace, currentPrepareStackTrace);
}

let OriginalCallSite;
LocalError.prepareStackTrace = (e, sst) => {
	OriginalCallSite = sst[0].constructor;
};
new LocalError().stack;
if (typeof OriginalCallSite === 'function') {
	LocalError.prepareStackTrace = undefined;

	function makeCallSiteGetters(list) {
		const callSiteGetters = [];
		for (let i=0; i<list.length; i++) {
			const name = list[i];
			const func = OriginalCallSite.prototype[name];
			callSiteGetters[i] = {__proto__: null,
				name,
				propName: '_' + name,
				func: (thiz) => {
					return localReflectApply(func, thiz, []);
				}
			};
		}
		return callSiteGetters;
	}

	function applyCallSiteGetters(thiz, callSite, getters) {
		for (let i=0; i<getters.length; i++) {
			const getter = getters[i];
			localReflectDefineProperty(thiz, getter.propName, {
				__proto__: null,
				value: getter.func(callSite)
			});
		}
	}

	const callSiteGetters = makeCallSiteGetters([
		'getTypeName',
		'getFunctionName',
		'getMethodName',
		'getFileName',
		'getLineNumber',
		'getColumnNumber',
		'getEvalOrigin',
		'isToplevel',
		'isEval',
		'isNative',
		'isConstructor',
		'isAsync',
		'isPromiseAll',
		'getPromiseIndex'
	]);

	class CallSite {
		constructor(callSite) {
			applyCallSiteGetters(this, callSite, callSiteGetters);
		}
		getThis() {
			return undefined;
		}
		getFunction() {
			return undefined;
		}
		toString() {
			return 'CallSite {}';
		}
	}


	for (let i=0; i<callSiteGetters.length; i++) {
		const name = callSiteGetters[i].name;
		const funcProp = localReflectGetOwnPropertyDescriptor(OriginalCallSite.prototype, name);
		if (!funcProp) continue;
		const propertyName = callSiteGetters[i].propName;
		const func = {func() {
			return this[propertyName];
		}}.func;
		const nameProp = localReflectGetOwnPropertyDescriptor(func, 'name');
		if (!nameProp) throw localUnexpected();
		nameProp.value = name;
		if (!localReflectDefineProperty(func, 'name', nameProp)) throw localUnexpected();
		funcProp.value = func;
		if (!localReflectDefineProperty(CallSite.prototype, name, funcProp)) throw localUnexpected();
	}

	if (!localReflectDefineProperty(LocalError, 'prepareStackTrace', {
		configurable: false,
		enumerable: false,
		get() {
			return currentPrepareStackTrace;
		},
		set(value) {
			if (typeof(value) !== 'function') {
				currentPrepareStackTrace = value;
				return;
			}
			const wrapped = localReflectApply(localWeakMapGet, wrappedPrepareStackTrace, [value]);
			if (wrapped) {
				currentPrepareStackTrace = wrapped;
				return;
			}
			const newWrapped = (error, sst) => {
				const sandboxSst = ensureThis(sst);
				if (localArrayIsArray(sst)) {
					if (sst === sandboxSst) {
						for (let i=0; i < sst.length; i++) {
							const cs = sst[i];
							if (typeof cs === 'object' && localReflectGetPrototypeOf(cs) === OriginalCallSite.prototype) {
								sst[i] = new CallSite(cs);
							}
						}
					} else {
						sst = [];
						for (let i=0; i < sandboxSst.length; i++) {
							const cs = sandboxSst[i];
							localReflectDefineProperty(sst, i, {
								__proto__: null,
								value: new CallSite(cs),
								enumerable: true,
								configurable: true,
								writable: true
							});
						}
					}
				} else {
					sst = sandboxSst;
				}
				return value(error, sst);
			};
			localReflectApply(localWeakMapSet, wrappedPrepareStackTrace, [value, newWrapped]);
			localReflectApply(localWeakMapSet, wrappedPrepareStackTrace, [newWrapped, newWrapped]);
			currentPrepareStackTrace = newWrapped;
		}
	})) throw localUnexpected();
} else if (oldPrepareStackTraceDesc) {
	localReflectDefineProperty(LocalError, 'prepareStackTrace', oldPrepareStackTraceDesc);
} else {
	localReflectDeleteProperty(LocalError, 'prepareStackTrace');
}

/*
 * Exception sanitization
 */

/*
 * SuppressedError sanitization
 *
 * When V8 internally creates SuppressedError during DisposableStack.dispose()
 * or 'using' declarations, the .error and .suppressed properties may contain
 * host-realm errors (e.g., TypeError from Symbol() name trick). Since the
 * SuppressedError is created in the sandbox context, ensureThis returns it
 * as-is, leaving its sub-error properties unsanitized.
 *
 * Fix: handleException detects SuppressedError instances and recursively
 * sanitizes their .error and .suppressed properties via ensureThis.
 */
const localSuppressedErrorProto = (typeof SuppressedError === 'function') ? SuppressedError.prototype : null;

function handleException(e, visited) {
	e = ensureThis(e);
	if (localSuppressedErrorProto !== null && e !== null && typeof e === 'object') {
		if (!visited) visited = new LocalWeakMap();
		// Cycle detection: if we've already visited this object, stop recursing
		if (apply(localWeakMapGet, visited, [e])) return e;
		apply(localWeakMapSet, visited, [e, true]);
		let proto;
		try {
			proto = localReflectGetPrototypeOf(e);
		} catch (ex) {
			return e;
		}
		while (proto !== null) {
			if (proto === localSuppressedErrorProto) {
				e.error = handleException(e.error, visited);
				e.suppressed = handleException(e.suppressed, visited);
				return e;
			}
			try {
				proto = localReflectGetPrototypeOf(proto);
			} catch (ex) {
				return e;
			}
		}
	}
	return e;
}

const withProxy = localObjectFreeze({
	__proto__: null,
	has(target, key) {
		if (key === host.INTERNAL_STATE_NAME) return false;
		return localReflectHas(target, key);
	}
});

const interanState = localObjectFreeze({
	__proto__: null,
	wrapWith(x) {
		if (x === null || x === undefined) return x;
		return new LocalProxy(localObject(x), withProxy);
	},
	handleException,
	import(what) {
		throw new VMError('Dynamic Import not supported');
	}
});

if (!localReflectDefineProperty(global, host.INTERNAL_STATE_NAME, {
	__proto__: null,
	configurable: false,
	enumerable: false,
	writable: false,
	value: interanState
})) throw localUnexpected();

/*
 * Eval sanitization
 */

function throwAsync() {
	return new VMError('Async not available');
}

function makeFunction(inputArgs, isAsync, isGenerator) {
	const lastArgs = inputArgs.length - 1;
	let code = lastArgs >= 0 ? `${inputArgs[lastArgs]}` : '';
	let args = lastArgs > 0 ? `${inputArgs[0]}` : '';
	for (let i = 1; i < lastArgs; i++) {
		args += `,${inputArgs[i]}`;
	}
	try {
		code = host.transformAndCheck(args, code, isAsync, isGenerator, allowAsync);
	} catch (e) {
		throw bridge.from(e);
	}
	return localEval(code);
}

const FunctionHandler = {
	__proto__: null,
	apply(target, thiz, args) {
		return makeFunction(args, this.isAsync, this.isGenerator);
	},
	construct(target, args, newTarget) {
		return makeFunction(args, this.isAsync, this.isGenerator);
	}
};

const EvalHandler = {
	__proto__: null,
	apply(target, thiz, args) {
		if (args.length === 0) return undefined;
		let code = `${args[0]}`;
		try {
			code = host.transformAndCheck(null, code, false, false, allowAsync);
		} catch (e) {
			throw bridge.from(e);
		}
		return localEval(code);
	}
};

const AsyncErrorHandler = {
	__proto__: null,
	apply(target, thiz, args) {
		throw throwAsync();
	},
	construct(target, args, newTarget) {
		throw throwAsync();
	}
};

function makeCheckFunction(isAsync, isGenerator) {
	if (isAsync && !allowAsync) return AsyncErrorHandler;
	return {
		__proto__: FunctionHandler,
		isAsync,
		isGenerator
	};
}

function overrideWithProxy(obj, prop, value, handler) {
	const proxy = new LocalProxy(value, handler);
	if (!localReflectDefineProperty(obj, prop, {__proto__: null, value: proxy})) throw localUnexpected();
	return proxy;
}

const proxiedFunction = overrideWithProxy(localFunction.prototype, 'constructor', localFunction, makeCheckFunction(false, false));
if (GeneratorFunction) {
	if (!localReflectSetPrototypeOf(GeneratorFunction, proxiedFunction)) throw localUnexpected();
	overrideWithProxy(GeneratorFunction.prototype, 'constructor', GeneratorFunction, makeCheckFunction(false, true));
}
if (AsyncFunction) {
	if (!localReflectSetPrototypeOf(AsyncFunction, proxiedFunction)) throw localUnexpected();
	overrideWithProxy(AsyncFunction.prototype, 'constructor', AsyncFunction, makeCheckFunction(true, false));
}
if (AsyncGeneratorFunction) {
	if (!localReflectSetPrototypeOf(AsyncGeneratorFunction, proxiedFunction)) throw localUnexpected();
	overrideWithProxy(AsyncGeneratorFunction.prototype, 'constructor', AsyncGeneratorFunction, makeCheckFunction(true, true));
}

function makeSafeHandlerArgs(args) {
	const sArgs = ensureThis(args);
	if (sArgs === args) return args;
	const a = [];
	for (let i=0; i < sArgs.length; i++) {
		localReflectDefineProperty(a, i, {
			__proto__: null,
			value: sArgs[i],
			enumerable: true,
			configurable: true,
			writable: true
		});
	}
	return a;
}

const makeSafeArgs = Object.freeze({
	__proto__: null,
	apply(target, thiz, args) {
		return localReflectApply(target, thiz, makeSafeHandlerArgs(args));
	},
	construct(target, args, newTarget) {
		return localReflectConstruct(target, makeSafeHandlerArgs(args), newTarget);
	}
});

const proxyHandlerHandler = Object.freeze({
	__proto__: null,
	get(target, name, receiver) {
		if (name === 'isProxy') return true;
		const value = target.handler[name];
		if (typeof value !== 'function') return value;
		return new LocalProxy(value, makeSafeArgs);
	}
});

function wrapProxyHandler(args) {
	if (args.length < 2) return args;
	const handler = args[1];
	args[1] = new LocalProxy({__proto__: null, handler}, proxyHandlerHandler);
	return args;
}

const proxyHandler = Object.freeze({
	__proto__: null,
	apply(target, thiz, args) {
		return localReflectApply(target, thiz, wrapProxyHandler(args));
	},
	construct(target, args, newTarget) {
		return localReflectConstruct(target, wrapProxyHandler(args), newTarget);
	}
});

const proxiedProxy = new LocalProxy(LocalProxy, proxyHandler);

overrideWithProxy(LocalProxy, 'revocable', LocalProxy.revocable, proxyHandler);

global.Proxy = proxiedProxy;
global.Function = proxiedFunction;
global.eval = new LocalProxy(localEval, EvalHandler);

/*
 * Promise sanitization
 */

if (localPromise) {

	const PromisePrototype = localPromise.prototype;

	if (!allowAsync) {

		overrideWithProxy(PromisePrototype, 'then', PromisePrototype.then, AsyncErrorHandler);
		// This seems not to work, and will produce
		// UnhandledPromiseRejectionWarning: TypeError: Method Promise.prototype.then called on incompatible receiver [object Object].
		// This is likely caused since the host.Promise.prototype.then cannot use the VM Proxy object.
		// Contextify.connect(host.Promise.prototype.then, Promise.prototype.then);

	} else {

		overrideWithProxy(PromisePrototype, 'then', PromisePrototype.then, {
			__proto__: null,
			apply(target, thiz, args) {
				if (args.length > 0) {
					const onFulfilled = args[0];
					if (typeof onFulfilled === 'function') {
						args[0] = function sanitizedOnFulfilled(value) {
							value = ensureThis(value);
							return localReflectApply(onFulfilled, this, [value]);
						};
					}
				}
				if (args.length > 1) {
					const onRejected = args[1];
					if (typeof onRejected === 'function') {
						args[1] = function sanitizedOnRejected(error) {
							error = handleException(error);
							return localReflectApply(onRejected, this, [error]);
						};
					}
				}
				return localReflectApply(target, thiz, args);
			}
		});

		overrideWithProxy(PromisePrototype, 'catch', PromisePrototype.catch, {
			__proto__: null,
			apply(target, thiz, args) {
				if (args.length > 0) {
					const onRejected = args[0];
					if (typeof onRejected === 'function') {
						args[0] = function sanitizedOnRejected(error) {
							error = handleException(error);
							return localReflectApply(onRejected, this, [error]);
						};
					}
				}
				return localReflectApply(target, thiz, args);
			}
		});

	}

	// Secure Promise static methods to prevent species attacks via static method stealing.
	//
	// Several methods are vulnerable because they catch errors during iteration/resolution
	// and pass them directly to the result promise's reject handler. If the attacker does:
	//   FakePromise.all = Promise.all; FakePromise.all(iterable);
	// Then `this` inside Promise.all is FakePromise, so it creates the result promise using
	// `new FakePromise(executor)`. When iteration throws a host error (e.g., from accessing
	// error.stack with error.name = Symbol()), Promise.all catches it and passes it to
	// FakePromise's reject handler, which receives the unsanitized host error.
	//
	// The fix wraps ALL Promise static methods to always use localPromise as the constructor,
	// ignoring `this`. This provides defense in depth even for methods like reject/withResolvers
	// that aren't currently known to be exploitable.
	//
	const globalPromiseTry = globalPromise.try;
	if (typeof globalPromiseTry === 'function') {
		globalPromise.try = function _try() {
			return apply(globalPromiseTry, localPromise, arguments);
		};
	}

	const globalPromiseAll = globalPromise.all;
	globalPromise.all = function all(iterable) {
		return apply(globalPromiseAll, localPromise, [iterable]);
	};

	const globalPromiseRace = globalPromise.race;
	globalPromise.race = function race(iterable) {
		return apply(globalPromiseRace, localPromise, [iterable]);
	};

	const globalPromiseAllSettled = globalPromise.allSettled;
	if (typeof globalPromiseAllSettled === 'function') {
		globalPromise.allSettled = function allSettled(iterable) {
			return apply(globalPromiseAllSettled, localPromise, [iterable]);
		};
	}

	const globalPromiseAny = globalPromise.any;
	if (typeof globalPromiseAny === 'function') {
		globalPromise.any = function any(iterable) {
			return apply(globalPromiseAny, localPromise, [iterable]);
		};
	}

	const globalPromiseResolve = globalPromise.resolve;
	globalPromise.resolve = function resolve(value) {
		return apply(globalPromiseResolve, localPromise, [value]);
	};

	const globalPromiseReject = globalPromise.reject;
	globalPromise.reject = function reject(reason) {
		return apply(globalPromiseReject, localPromise, [reason]);
	};

	const globalPromiseWithResolvers = globalPromise.withResolvers;
	if (typeof globalPromiseWithResolvers === 'function') {
		globalPromise.withResolvers = function withResolvers() {
			return apply(globalPromiseWithResolvers, localPromise, []);
		};
	}

	// Freeze globalPromise to prevent Symbol.hasInstance override
	// (which would bypass the instanceof check in resetPromiseSpecies).
	// Freeze globalPromise.prototype to prevent defining accessor properties
	// on 'constructor' that could be used for TOCTOU attacks via the prototype chain.
	Object.freeze(globalPromise);
	Object.freeze(globalPromise.prototype);
	Object.freeze(localPromise);
	Object.freeze(PromisePrototype);
}


function readonly(other, mock) {
	// Note: other@other(unsafe) mock@other(unsafe) returns@this(unsafe) throws@this(unsafe)
	if (!mock) return fromWithFactory(readonlyFactory, other);
	const tmock = from(mock);
	return fromWithFactory(obj=>new ReadOnlyMockHandler(obj, tmock), other);
}

return {
	__proto__: null,
	readonly,
	global
};
