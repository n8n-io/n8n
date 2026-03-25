'use strict';

/**
 * __        ___    ____  _   _ ___ _   _  ____
 * \ \      / / \  |  _ \| \ | |_ _| \ | |/ ___|
 *  \ \ /\ / / _ \ | |_) |  \| || ||  \| | |  _
 *   \ V  V / ___ \|  _ <| |\  || || |\  | |_| |
 *    \_/\_/_/   \_\_| \_\_| \_|___|_| \_|\____|
 *
 * This file is critical for vm2. It implements the bridge between the host and the sandbox.
 * If you do not know exactly what you are doing, you should NOT edit this file.
 *
 * The file is loaded in the host and sandbox to handle objects in both directions.
 * This is done to ensure that RangeErrors are from the correct context.
 * The boundary between the sandbox and host might throw RangeErrors from both contexts.
 * Therefore, thisFromOther and friends can handle objects from both domains.
 *
 * Method parameters have comments to tell from which context they came.
 *
 */

const globalsList = [
	'Number',
	'String',
	'Boolean',
	'Date',
	'RegExp',
	'Map',
	'WeakMap',
	'Set',
	'WeakSet',
	'Promise',
	'Function'
];

const errorsList = [
	'RangeError',
	'ReferenceError',
	'SyntaxError',
	'TypeError',
	'EvalError',
	'URIError',
	'SuppressedError',
	'Error'
];

const OPNA = 'Operation not allowed on contextified object.';

const thisGlobalPrototypes = {
	__proto__: null,
	Object: Object.prototype,
	Array: Array.prototype
};

for (let i = 0; i < globalsList.length; i++) {
	const key = globalsList[i];
	const g = global[key];
	if (g) thisGlobalPrototypes[key] = g.prototype;
}

for (let i = 0; i < errorsList.length; i++) {
	const key = errorsList[i];
	const g = global[key];
	if (g) thisGlobalPrototypes[key] = g.prototype;
}

// Add non-global function constructor prototypes for cross-realm blocking.
// These are not on `global` but are needed to block sandbox escape via
// AsyncFunction('code'), GeneratorFunction('code'), etc.
try {
	thisGlobalPrototypes['AsyncFunction'] = (async function() {}).constructor.prototype;
} catch (e) {}
try {
	thisGlobalPrototypes['GeneratorFunction'] = (function*() {}).constructor.prototype;
} catch (e) {}
try {
	// Use eval to avoid syntax error on Node < 10 where async generators don't exist
	thisGlobalPrototypes['AsyncGeneratorFunction'] = eval('(async function*() {})').constructor.prototype;
} catch (e) {}

// Cache this-realm dangerous function constructors.
// Used to block raw host Function constructors from leaking when handler
// methods are called directly (e.g., via showProxy handler exposure).
// This complements isDangerousFunctionConstructor which checks OTHER-realm constructors.
let thisAsyncFunctionCtor;
let thisGeneratorFunctionCtor;
let thisAsyncGeneratorFunctionCtor;
try {
	if (thisGlobalPrototypes.AsyncFunction) {
		const desc = thisReflectGetOwnPropertyDescriptor(thisGlobalPrototypes.AsyncFunction, 'constructor');
		if (desc) thisAsyncFunctionCtor = desc.value;
	}
} catch (e) {}
try {
	if (thisGlobalPrototypes.GeneratorFunction) {
		const desc = thisReflectGetOwnPropertyDescriptor(thisGlobalPrototypes.GeneratorFunction, 'constructor');
		if (desc) thisGeneratorFunctionCtor = desc.value;
	}
} catch (e) {}
try {
	if (thisGlobalPrototypes.AsyncGeneratorFunction) {
		const desc = thisReflectGetOwnPropertyDescriptor(thisGlobalPrototypes.AsyncGeneratorFunction, 'constructor');
		if (desc) thisAsyncGeneratorFunctionCtor = desc.value;
	}
} catch (e) {}

function isThisDangerousFunctionConstructor(value) {
	return value === thisFunction ||
		(thisAsyncFunctionCtor && value === thisAsyncFunctionCtor) ||
		(thisGeneratorFunctionCtor && value === thisGeneratorFunctionCtor) ||
		(thisAsyncGeneratorFunctionCtor && value === thisAsyncGeneratorFunctionCtor);
}

const {
	getPrototypeOf: thisReflectGetPrototypeOf,
	setPrototypeOf: thisReflectSetPrototypeOf,
	defineProperty: thisReflectDefineProperty,
	deleteProperty: thisReflectDeleteProperty,
	getOwnPropertyDescriptor: thisReflectGetOwnPropertyDescriptor,
	isExtensible: thisReflectIsExtensible,
	preventExtensions: thisReflectPreventExtensions,
	apply: thisReflectApply,
	construct: thisReflectConstruct,
	set: thisReflectSet,
	get: thisReflectGet,
	has: thisReflectHas,
	ownKeys: thisReflectOwnKeys,
	enumerate: thisReflectEnumerate,
} = Reflect;

const thisObject = Object;
const {
	freeze: thisObjectFreeze,
	prototype: thisObjectPrototype
} = thisObject;
const thisObjectHasOwnProperty = thisObjectPrototype.hasOwnProperty;
const ThisProxy = Proxy;
const ThisWeakMap = WeakMap;
const thisWeakMapProto = ThisWeakMap.prototype;
const thisWeakMapGet = thisWeakMapProto.get;
const thisWeakMapSet = thisWeakMapProto.set;
const ThisMap = Map;
const thisMapGet = ThisMap.prototype.get;
const thisMapSet = ThisMap.prototype.set;
const thisFunction = Function;
const thisFunctionBind = thisFunction.prototype.bind;
const thisArrayIsArray = Array.isArray;
const thisErrorCaptureStackTrace = Error.captureStackTrace;

const thisSymbolToString = Symbol.prototype.toString;
const thisSymbolToStringTag = Symbol.toStringTag;
const thisSymbolIterator = Symbol.iterator;
const thisSymbolNodeJSUtilInspectCustom = Symbol.for('nodejs.util.inspect.custom');
const thisSymbolNodeJSRejection = Symbol.for('nodejs.rejection');

function isDangerousCrossRealmSymbol(key) {
	return key === thisSymbolNodeJSUtilInspectCustom || key === thisSymbolNodeJSRejection;
}

/**
 * VMError.
 *
 * @public
 * @extends {Error}
 */
class VMError extends Error {

	/**
	 * Create VMError instance.
	 *
	 * @public
	 * @param {string} message - Error message.
	 * @param {string} code - Error code.
	 */
	constructor(message, code) {
		super(message);

		this.name = 'VMError';
		this.code = code;

		thisErrorCaptureStackTrace(this, this.constructor);
	}
}

thisGlobalPrototypes['VMError'] = VMError.prototype;

function thisUnexpected() {
	return new VMError('Unexpected');
}

if (!thisReflectSetPrototypeOf(exports, null)) throw thisUnexpected();

function thisSafeGetOwnPropertyDescriptor(obj, key) {
	const desc = thisReflectGetOwnPropertyDescriptor(obj, key);
	if (!desc) return desc;
	if (!thisReflectSetPrototypeOf(desc, null)) throw thisUnexpected();
	return desc;
}

function thisThrowCallerCalleeArgumentsAccess(key) {
	'use strict';
	thisThrowCallerCalleeArgumentsAccess[key];
	return thisUnexpected();
}

function thisIdMapping(factory, other) {
	return other;
}

const thisThrowOnKeyAccessHandler = thisObjectFreeze({
	__proto__: null,
	get(target, key, receiver) {
		if (key === 'isProxy') return true;
		if (typeof key === 'symbol') {
			key = thisReflectApply(thisSymbolToString, key, []);
		} else if (key === 'href') {
			// Fixes util.inspect in Node.js 22 that performs checks for URL by accessing the href property.
			return undefined;
		}
		throw new VMError(`Unexpected access to key '${key}'`);
	}
});

const emptyFrozenObject = thisObjectFreeze({
	__proto__: null
});

const thisThrowOnKeyAccess = new ThisProxy(emptyFrozenObject, thisThrowOnKeyAccessHandler);

function SafeBase() {}

if (!thisReflectDefineProperty(SafeBase, 'prototype', {
	__proto__: null,
	value: thisThrowOnKeyAccess
})) throw thisUnexpected();

function SHARED_FUNCTION() {}

const TEST_PROXY_HANDLER = thisObjectFreeze({
	__proto__: thisThrowOnKeyAccess,
	construct() {
		return this;
	}
});

function thisIsConstructor(obj) {
	// Note: obj@any(unsafe)
	const Func = new ThisProxy(obj, TEST_PROXY_HANDLER);
	try {
		// eslint-disable-next-line no-new
		new Func();
		return true;
	} catch (e) {
		return false;
	}
}

function thisCreateTargetObject(obj, proto) {
	// Note: obj@any(unsafe) proto@any(unsafe) returns@this(unsafe) throws@this(unsafe)
	let base;
	if (typeof obj === 'function') {
		if (thisIsConstructor(obj)) {
			// Bind the function since bound functions do not have a prototype property.
			base = thisReflectApply(thisFunctionBind, SHARED_FUNCTION, [null]);
		} else {
			base = () => {};
		}
	} else if (thisArrayIsArray(obj)) {
		base = [];
	} else {
		return {__proto__: proto};
	}
	if (!thisReflectSetPrototypeOf(base, proto)) throw thisUnexpected();
	return base;
}

function createBridge(otherInit, registerProxy) {

	const mappingOtherToThis = new ThisWeakMap();
	const protoMappings = new ThisMap();
	const protoName = new ThisMap();
	// Store wrapped objects in a WeakMap keyed by handler instance.
	// This prevents exposure of raw objects via util.inspect with showProxy:true,
	// which can leak the handler's internal state.
	const handlerToObject = new ThisWeakMap();
	// Store factory functions in a WeakMap keyed by handler instance.
	// This prevents exposure of factory functions via util.inspect with showProxy:true,
	// which would allow attackers to create new handlers wrapping attacker-controlled objects.
	const handlerToFactory = new ThisWeakMap();

	// Closure-scoped function to retrieve the wrapped object from a handler.
	// This is NOT a method on BaseHandler, so it cannot be called by attackers
	// even if they obtain a reference to the handler via showProxy.
	function getHandlerObject(handler) {
		return thisReflectApply(thisWeakMapGet, handlerToObject, [handler]);
	}

	// Closure-scoped function to retrieve the factory from a handler.
	// This is NOT a method on BaseHandler, so it cannot be called by attackers
	// even if they obtain a reference to the handler via showProxy.
	function getHandlerFactory(handler) {
		return thisReflectApply(thisWeakMapGet, handlerToFactory, [handler]);
	}

	// Closure-scoped function to convert other-realm objects to this-realm with factory.
	// This is NOT a method on BaseHandler, so it cannot be called by attackers
	// even if they obtain a reference to the handler via showProxy.
	function handlerFromOtherWithContext(handler, other) {
		return thisFromOtherWithFactory(getHandlerFactory(handler), other);
	}

	// Closure-scoped function to prevent extensions on a proxy target.
	// This is NOT a method on BaseHandler, so it cannot be called by attackers
	// even if they obtain a reference to the handler via showProxy.
	// Unlike other handler methods which use getHandlerObject(this), the old
	// doPreventExtensions accepted `object` as a direct parameter, allowing
	// attackers to pass crafted objects. Now it retrieves `object` from the WeakMap.
	function doPreventExtensions(handler, target) {
		// Note: handler@this(unsafe) target@this(unsafe) throws@this(unsafe)
		const object = getHandlerObject(handler); // @other(unsafe)
		let keys; // @other(safe-array-of-prim)
		try {
			keys = otherReflectOwnKeys(object);
		} catch (e) { // @other(unsafe)
			throw thisFromOtherForThrow(e);
		}
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]; // @prim
			// Skip dangerous cross-realm symbols
			if (isDangerousCrossRealmSymbol(key)) continue;
			let desc;
			try {
				desc = otherSafeGetOwnPropertyDescriptor(object, key);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			if (!desc) continue;
			if (!desc.configurable) {
				const current = thisSafeGetOwnPropertyDescriptor(target, key);
				if (current && !current.configurable) continue;
				if (desc.get || desc.set) {
					desc.get = handlerFromOtherWithContext(handler, desc.get);
					desc.set = handlerFromOtherWithContext(handler, desc.set);
				} else if (typeof object === 'function' && (key === 'caller' || key === 'callee' || key === 'arguments')) {
					desc.value = null;
				} else {
					desc.value = handlerFromOtherWithContext(handler, desc.value);
				}
			} else {
				if (desc.get || desc.set) {
					desc = {
						__proto__: null,
						configurable: true,
						enumerable: desc.enumerable,
						writable: true,
						value: null
					};
				} else {
					desc.value = null;
				}
			}
			if (!thisReflectDefineProperty(target, key, desc)) throw thisUnexpected();
		}
		if (!thisReflectPreventExtensions(target)) throw thisUnexpected();
	}

	function thisAddProtoMapping(proto, other, name) {
		// Note: proto@this(unsafe) other@other(unsafe) name@this(unsafe) throws@this(unsafe)
		thisReflectApply(thisMapSet, protoMappings, [proto, thisIdMapping]);
		thisReflectApply(thisMapSet, protoMappings, [other,
			(factory, object, preventUnwrap) => thisProxyOther(factory, object, proto, preventUnwrap)]);
		if (name) thisReflectApply(thisMapSet, protoName, [proto, name]);
	}

	function thisAddProtoMappingFactory(protoFactory, other, name) {
		// Note: protoFactory@this(unsafe) other@other(unsafe) name@this(unsafe) throws@this(unsafe)
		let proto;
		thisReflectApply(thisMapSet, protoMappings, [other,
			(factory, object, preventUnwrap) => {
				if (!proto) {
					proto = protoFactory();
					thisReflectApply(thisMapSet, protoMappings, [proto, thisIdMapping]);
					if (name) thisReflectApply(thisMapSet, protoName, [proto, name]);
				}
				return thisProxyOther(factory, object, proto, preventUnwrap);
			}]);
	}

	const result = {
		__proto__: null,
		globalPrototypes: thisGlobalPrototypes,
		safeGetOwnPropertyDescriptor: thisSafeGetOwnPropertyDescriptor,
		fromArguments: thisFromOtherArguments,
		from: thisFromOther,
		fromWithFactory: thisFromOtherWithFactory,
		ensureThis: thisEnsureThis,
		mapping: mappingOtherToThis,
		connect: thisConnect,
		reflectSet: thisReflectSet,
		reflectGet: thisReflectGet,
		reflectDefineProperty: thisReflectDefineProperty,
		reflectDeleteProperty: thisReflectDeleteProperty,
		reflectApply: thisReflectApply,
		reflectConstruct: thisReflectConstruct,
		reflectHas: thisReflectHas,
		reflectOwnKeys: thisReflectOwnKeys,
		reflectEnumerate: thisReflectEnumerate,
		reflectGetPrototypeOf: thisReflectGetPrototypeOf,
		reflectIsExtensible: thisReflectIsExtensible,
		reflectPreventExtensions: thisReflectPreventExtensions,
		objectHasOwnProperty: thisObjectHasOwnProperty,
		weakMapSet: thisWeakMapSet,
		addProtoMapping: thisAddProtoMapping,
		addProtoMappingFactory: thisAddProtoMappingFactory,
		defaultFactory,
		protectedFactory,
		readonlyFactory,
		VMError
	};

	const isHost = typeof otherInit !== 'object';

	if (isHost) {
		otherInit = otherInit(result, registerProxy);
	}

	result.other = otherInit;

	const {
		globalPrototypes: otherGlobalPrototypes,
		safeGetOwnPropertyDescriptor: otherSafeGetOwnPropertyDescriptor,
		fromArguments: otherFromThisArguments,
		from: otherFromThis,
		mapping: mappingThisToOther,
		reflectSet: otherReflectSet,
		reflectGet: otherReflectGet,
		reflectDefineProperty: otherReflectDefineProperty,
		reflectDeleteProperty: otherReflectDeleteProperty,
		reflectApply: otherReflectApply,
		reflectConstruct: otherReflectConstruct,
		reflectHas: otherReflectHas,
		reflectOwnKeys: otherReflectOwnKeys,
		reflectEnumerate: otherReflectEnumerate,
		reflectGetPrototypeOf: otherReflectGetPrototypeOf,
		reflectIsExtensible: otherReflectIsExtensible,
		reflectPreventExtensions: otherReflectPreventExtensions,
		objectHasOwnProperty: otherObjectHasOwnProperty,
		weakMapSet: otherWeakMapSet
	} = otherInit;

	// Cache the other realm's Function constructors to block them from crossing the bridge.
	// This prevents sandbox escape via indirect access paths like
	// Object.getOwnPropertyDescriptor(Function.prototype, 'constructor').value
	// We block all code-executing constructors: Function, AsyncFunction, GeneratorFunction, AsyncGeneratorFunction
	// IMPORTANT: We must get these from otherGlobalPrototypes (the OTHER realm), not from
	// local function instances which would give us THIS realm's constructors.
	let otherFunctionCtor;
	let otherAsyncFunctionCtor;
	let otherGeneratorFunctionCtor;
	let otherAsyncGeneratorFunctionCtor;
	try {
		const desc = otherSafeGetOwnPropertyDescriptor(otherGlobalPrototypes.Function, 'constructor');
		if (desc) otherFunctionCtor = desc.value;
	} catch (e) {
		// If we can't get it, the get trap's constructor case still provides protection
	}
	// Get AsyncFunction, GeneratorFunction, AsyncGeneratorFunction constructors from OTHER realm
	try {
		if (otherGlobalPrototypes.AsyncFunction) {
			const desc = otherSafeGetOwnPropertyDescriptor(otherGlobalPrototypes.AsyncFunction, 'constructor');
			if (desc) otherAsyncFunctionCtor = desc.value;
		}
	} catch (e) {}
	try {
		if (otherGlobalPrototypes.GeneratorFunction) {
			const desc = otherSafeGetOwnPropertyDescriptor(otherGlobalPrototypes.GeneratorFunction, 'constructor');
			if (desc) otherGeneratorFunctionCtor = desc.value;
		}
	} catch (e) {}
	try {
		if (otherGlobalPrototypes.AsyncGeneratorFunction) {
			const desc = otherSafeGetOwnPropertyDescriptor(otherGlobalPrototypes.AsyncGeneratorFunction, 'constructor');
			if (desc) otherAsyncGeneratorFunctionCtor = desc.value;
		}
	} catch (e) {}

	function isDangerousFunctionConstructor(value) {
		return value === otherFunctionCtor ||
			value === otherAsyncFunctionCtor ||
			value === otherGeneratorFunctionCtor ||
			(otherAsyncGeneratorFunctionCtor && value === otherAsyncGeneratorFunctionCtor); // AsyncGeneratorFunction is not available on Node < 10
	}

	// Check if an object contains a dangerous function constructor in ANY of its
	// own property values (data or accessor), recursively at any nesting depth.
	// Uses cycle detection and otherSafeGetOwnPropertyDescriptor (not otherReflectGet)
	// to avoid triggering getters.
	function containsDangerousConstructor(obj, visited) {
		if (obj === null || typeof obj !== 'object') return false;

		if (!visited) visited = new ThisWeakMap();
		if (thisReflectApply(thisWeakMapGet, visited, [obj])) return false;
		thisReflectApply(thisWeakMapSet, visited, [obj, true]);

		let keys;
		try {
			keys = otherReflectOwnKeys(obj);
		} catch (e) {
			return false;
		}

		for (let i = 0; i < keys.length; i++) {
			let desc;
			try {
				desc = otherSafeGetOwnPropertyDescriptor(obj, keys[i]);
			} catch (e) {
				continue;
			}
			if (!desc) continue;

			if (desc.get || desc.set) {
				if (isDangerousFunctionConstructor(desc.get) || isDangerousFunctionConstructor(desc.set)) return true;
			} else {
				if (isDangerousFunctionConstructor(desc.value)) return true;
				if (desc.value !== null && typeof desc.value === 'object') {
					if (containsDangerousConstructor(desc.value, visited)) return true;
				}
			}
		}
		return false;
	}

	function thisOtherHasOwnProperty(object, key) {
		// Note: object@other(safe) key@prim throws@this(unsafe)
		try {
			return otherReflectApply(otherObjectHasOwnProperty, object, [key]) === true;
		} catch (e) { // @other(unsafe)
			throw thisFromOtherForThrow(e);
		}
	}

	function thisDefaultGet(handler, object, key, desc) {
		// Note: object@other(unsafe) key@prim desc@other(safe)
		let ret; // @other(unsafe)
		if (desc.get || desc.set) {
			const getter = desc.get;
			if (!getter) return undefined;
			try {
				ret = otherReflectApply(getter, object, [key]);
			} catch (e) {
				throw thisFromOtherForThrow(e);
			}
		} else {
			ret = desc.value;
		}
		return handlerFromOtherWithContext(handler, ret);
	}

	function otherFromThisIfAvailable(to, from, key) {
		// Note: to@other(safe) from@this(safe) key@prim throws@this(unsafe)
		if (!thisReflectApply(thisObjectHasOwnProperty, from, [key])) return false;
		try {
			to[key] = otherFromThis(from[key]);
		} catch (e) { // @other(unsafe)
			throw thisFromOtherForThrow(e);
		}
		return true;
	}

	class BaseHandler extends SafeBase {

		constructor(object) {
			// Note: object@other(unsafe) throws@this(unsafe)
			super();
			// Store the object in a WeakMap instead of as an instance property.
			// This prevents leaking the raw object via util.inspect with showProxy:true,
			// which exposes proxy handlers and their properties.
			// NOTE: There is intentionally NO getObject() method on this class.
			// The object is retrieved via the closure-scoped getHandlerObject() function,
			// which is not accessible to attackers even if they obtain a handler reference.
			thisReflectApply(thisWeakMapSet, handlerToObject, [this, object]);
			// Store the factory in a WeakMap instead of as a method.
			// NOTE: There is intentionally NO getFactory() method on this class.
			// The factory is retrieved via the closure-scoped getHandlerFactory() function,
			// which is not accessible to attackers even if they obtain a handler reference.
			// Subclass constructors override this with their specific factory.
			thisReflectApply(thisWeakMapSet, handlerToFactory, [this, defaultFactory]);
		}

		get(target, key, receiver) {
			if (key === 'isProxy') return true;
			// Note: target@this(unsafe) key@prim receiver@this(unsafe) throws@this(unsafe)
			const object = getHandlerObject(this); // @other(unsafe)
			switch (key) {
				case 'constructor': {
					const desc = otherSafeGetOwnPropertyDescriptor(object, key);
					if (desc) {
						if (desc.value && isDangerousFunctionConstructor(desc.value)) return {};
						return thisDefaultGet(this, object, key, desc);
					}
					const proto = thisReflectGetPrototypeOf(target);
					if (proto === null) return undefined;
					const ctor = proto.constructor;
					// Defense in depth: block this-realm dangerous function constructors.
					// Normally handler methods are only called by the proxy mechanism
					// which handles return values safely, but if the handler is exposed
					// (e.g., via util.inspect showProxy), attackers can call get()
					// directly with a forged target, leaking raw host constructors.
					if (isThisDangerousFunctionConstructor(ctor)) return {};
					return ctor;
				}
				case '__proto__': {
					const desc = otherSafeGetOwnPropertyDescriptor(object, key);
					if (desc) return thisDefaultGet(this, object, key, desc);
					return thisReflectGetPrototypeOf(target);
				}
				case thisSymbolToStringTag:
					if (!thisOtherHasOwnProperty(object, thisSymbolToStringTag)) {
						const proto = thisReflectGetPrototypeOf(target);
						const name = thisReflectApply(thisMapGet, protoName, [proto]);
						if (name) return name;
					}
					break;
				case 'arguments':
				case 'caller':
				case 'callee':
					if (typeof object === 'function' && thisOtherHasOwnProperty(object, key)) {
						throw thisThrowCallerCalleeArgumentsAccess(key);
					}
					break;
			}
			let ret; // @other(unsafe)
			try {
				ret = otherReflectGet(object, key);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			return handlerFromOtherWithContext(this,ret);
		}

		set(target, key, value, receiver) {
			// Note: target@this(unsafe) key@prim value@this(unsafe) receiver@this(unsafe) throws@this(unsafe)
			const object = getHandlerObject(this); // @other(unsafe)
			if (key === '__proto__' && !thisOtherHasOwnProperty(object, key)) {
				return this.setPrototypeOf(target, value);
			}
			try {
				value = otherFromThis(value);
				return otherReflectSet(object, key, value) === true;
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
		}

		getPrototypeOf(target) {
			// Note: target@this(unsafe)
			return thisReflectGetPrototypeOf(target);
		}

		setPrototypeOf(target, value) {
			// Note: target@this(unsafe) throws@this(unsafe)
			throw new VMError(OPNA);
		}

		apply(target, context, args) {
			// Note: target@this(unsafe) context@this(unsafe) args@this(safe-array) throws@this(unsafe)
			const object = getHandlerObject(this); // @other(unsafe)
			let ret; // @other(unsafe)
			try {
				context = otherFromThis(context);
				args = otherFromThisArguments(args);
				ret = otherReflectApply(object, context, args);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			return thisFromOther(ret);
		}

		construct(target, args, newTarget) {
			// Note: target@this(unsafe) args@this(safe-array) newTarget@this(unsafe) throws@this(unsafe)
			const object = getHandlerObject(this); // @other(unsafe)
			let ret; // @other(unsafe)
			try {
				args = otherFromThisArguments(args);
				ret = otherReflectConstruct(object, args);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			return thisFromOtherWithFactory(getHandlerFactory(this), ret, thisFromOther(object));
		}

		getOwnPropertyDescriptorDesc(target, prop, desc) {
			// Note: target@this(unsafe) prop@prim desc@other{safe} throws@this(unsafe)
			const object = getHandlerObject(this); // @other(unsafe)
			if (desc && typeof object === 'function' && (prop === 'arguments' || prop === 'caller' || prop === 'callee')) desc.value = null;
			// Block sandbox access to host's Function constructor via getOwnPropertyDescriptor.
			// This mirrors the protection in the get() trap at the 'constructor' case.
			// Only block when sandbox (!isHost) accesses host objects, not when host inspects sandbox.
			if (!isHost && desc && prop === 'constructor' && desc.value && isDangerousFunctionConstructor(desc.value)) {
				return undefined;
			}
			return desc;
		}

		getOwnPropertyDescriptor(target, prop) {
			// Note: target@this(unsafe) prop@prim throws@this(unsafe)
			// Filter dangerous cross-realm symbols to prevent extraction
			if (isDangerousCrossRealmSymbol(prop)) return undefined;
			const object = getHandlerObject(this); // @other(unsafe)
			let desc; // @other(safe)
			try {
				desc = otherSafeGetOwnPropertyDescriptor(object, prop);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}

			desc = this.getOwnPropertyDescriptorDesc(target, prop, desc);

			if (!desc) return undefined;

			let thisDesc;
			if (desc.get || desc.set) {
				thisDesc = {
					__proto__: null,
					get: handlerFromOtherWithContext(this,desc.get),
					set: handlerFromOtherWithContext(this,desc.set),
					enumerable: desc.enumerable === true,
					configurable: desc.configurable === true
				};
			} else {
				thisDesc = {
					__proto__: null,
					value: handlerFromOtherWithContext(this,desc.value),
					writable: desc.writable === true,
					enumerable: desc.enumerable === true,
					configurable: desc.configurable === true
				};
			}
			if (!thisDesc.configurable) {
				const oldDesc = thisSafeGetOwnPropertyDescriptor(target, prop);
				if (!oldDesc || oldDesc.configurable || oldDesc.writable !== thisDesc.writable) {
					if (!thisReflectDefineProperty(target, prop, thisDesc)) throw thisUnexpected();
				}
			}
			return thisDesc;
		}

		definePropertyDesc(target, prop, desc) {
			// Note: target@this(unsafe) prop@prim desc@this(safe) throws@this(unsafe)
			return desc;
		}

		defineProperty(target, prop, desc) {
			// Note: target@this(unsafe) prop@prim desc@this(unsafe) throws@this(unsafe)
			const object = getHandlerObject(this); // @other(unsafe)
			if (!thisReflectSetPrototypeOf(desc, null)) throw thisUnexpected();

			desc = this.definePropertyDesc(target, prop, desc);

			if (!desc) return false;

			let otherDesc = {__proto__: null};
			let hasFunc = true;
			let hasValue = true;
			let hasBasic = true;
			hasFunc &= otherFromThisIfAvailable(otherDesc, desc, 'get');
			hasFunc &= otherFromThisIfAvailable(otherDesc, desc, 'set');
			hasValue &= otherFromThisIfAvailable(otherDesc, desc, 'value');
			hasValue &= otherFromThisIfAvailable(otherDesc, desc, 'writable');
			hasBasic &= otherFromThisIfAvailable(otherDesc, desc, 'enumerable');
			hasBasic &= otherFromThisIfAvailable(otherDesc, desc, 'configurable');

			try {
				if (!otherReflectDefineProperty(object, prop, otherDesc)) return false;
				if (otherDesc.configurable !== true && (!hasBasic || !(hasFunc || hasValue))) {
					otherDesc = otherSafeGetOwnPropertyDescriptor(object, prop);
				}
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}

			if (!otherDesc.configurable) {
				let thisDesc;
				if (otherDesc.get || otherDesc.set) {
					thisDesc = {
						__proto__: null,
						get: handlerFromOtherWithContext(this,otherDesc.get),
						set: handlerFromOtherWithContext(this,otherDesc.set),
						enumerable: otherDesc.enumerable,
						configurable: otherDesc.configurable
					};
				} else {
					thisDesc = {
						__proto__: null,
						value: handlerFromOtherWithContext(this,otherDesc.value),
						writable: otherDesc.writable,
						enumerable: otherDesc.enumerable,
						configurable: otherDesc.configurable
					};
				}
				if (!thisReflectDefineProperty(target, prop, thisDesc)) throw thisUnexpected();
			}
			return true;
		}

		deleteProperty(target, prop) {
			// Note: target@this(unsafe) prop@prim throws@this(unsafe)
			const object = getHandlerObject(this); // @other(unsafe)
			try {
				return otherReflectDeleteProperty(object, prop) === true;
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
		}

		has(target, key) {
			// Note: target@this(unsafe) key@prim throws@this(unsafe)
			// Filter dangerous cross-realm symbols
			if (isDangerousCrossRealmSymbol(key)) return false;
			const object = getHandlerObject(this); // @other(unsafe)
			try {
				return otherReflectHas(object, key) === true;
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
		}

		isExtensible(target) {
			// Note: target@this(unsafe) throws@this(unsafe)
			const object = getHandlerObject(this); // @other(unsafe)
			try {
				if (otherReflectIsExtensible(object)) return true;
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			if (thisReflectIsExtensible(target)) {
				doPreventExtensions(this, target);
			}
			return false;
		}

		ownKeys(target) {
			// Note: target@this(unsafe) throws@this(unsafe)
			const object = getHandlerObject(this); // @other(unsafe)
			let res; // @other(unsafe)
			try {
				res = otherReflectOwnKeys(object);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			// Filter dangerous cross-realm symbols to prevent extraction via spread operator
			const keys = thisFromOther(res);
			const filtered = [];
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				if (!isDangerousCrossRealmSymbol(key)) {
					thisReflectDefineProperty(filtered, filtered.length, {
						__proto__: null,
						value: key,
						writable: true,
						enumerable: true,
						configurable: true
					});
				}
			}
			return filtered;
		}

		preventExtensions(target) {
			// Note: target@this(unsafe) throws@this(unsafe)
			const object = getHandlerObject(this); // @other(unsafe)
			try {
				if (!otherReflectPreventExtensions(object)) return false;
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			if (thisReflectIsExtensible(target)) {
				doPreventExtensions(this, target);
			}
			return true;
		}

		enumerate(target) {
			// Note: target@this(unsafe) throws@this(unsafe)
			const object = getHandlerObject(this); // @other(unsafe)
			let res; // @other(unsafe)
			try {
				res = otherReflectEnumerate(object);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			return handlerFromOtherWithContext(this,res);
		}

	}

	BaseHandler.prototype[thisSymbolNodeJSUtilInspectCustom] = undefined;
	BaseHandler.prototype[thisSymbolToStringTag] = 'VM2 Wrapper';
	BaseHandler.prototype[thisSymbolIterator] = undefined;

	function defaultFactory(object) {
		// Note: other@other(unsafe) returns@this(unsafe) throws@this(unsafe)
		return new BaseHandler(object);
	}

	class ProtectedHandler extends BaseHandler {

		constructor(object) {
			super(object);
			thisReflectApply(thisWeakMapSet, handlerToFactory, [this, protectedFactory]);
		}

		set(target, key, value, receiver) {
			// Note: target@this(unsafe) key@prim value@this(unsafe) receiver@this(unsafe) throws@this(unsafe)
			if (typeof value === 'function') {
				return thisReflectDefineProperty(receiver, key, {
					__proto__: null,
					value: value,
					writable: true,
					enumerable: true,
					configurable: true
				}) === true;
			}
			return super.set(target, key, value, receiver);
		}

		definePropertyDesc(target, prop, desc) {
			// Note: target@this(unsafe) prop@prim desc@this(safe) throws@this(unsafe)
			if (desc && (desc.set || desc.get || typeof desc.value === 'function')) return undefined;
			return desc;
		}

	}

	function protectedFactory(object) {
		// Note: other@other(unsafe) returns@this(unsafe) throws@this(unsafe)
		return new ProtectedHandler(object);
	}

	class ReadOnlyHandler extends BaseHandler {

		constructor(object) {
			super(object);
			thisReflectApply(thisWeakMapSet, handlerToFactory, [this, readonlyFactory]);
		}

		set(target, key, value, receiver) {
			// Note: target@this(unsafe) key@prim value@this(unsafe) receiver@this(unsafe) throws@this(unsafe)
			return thisReflectDefineProperty(receiver, key, {
				__proto__: null,
				value: value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}

		setPrototypeOf(target, value) {
			// Note: target@this(unsafe) throws@this(unsafe)
			return false;
		}

		defineProperty(target, prop, desc) {
			// Note: target@this(unsafe) prop@prim desc@this(unsafe) throws@this(unsafe)
			return false;
		}

		deleteProperty(target, prop) {
			// Note: target@this(unsafe) prop@prim throws@this(unsafe)
			return false;
		}

		isExtensible(target) {
			// Note: target@this(unsafe) throws@this(unsafe)
			return false;
		}

		preventExtensions(target) {
			// Note: target@this(unsafe) throws@this(unsafe)
			return false;
		}

	}

	function readonlyFactory(object) {
		// Note: other@other(unsafe) returns@this(unsafe) throws@this(unsafe)
		return new ReadOnlyHandler(object);
	}

	class ReadOnlyMockHandler extends ReadOnlyHandler {

		constructor(object, mock) {
			// Note: object@other(unsafe) mock:this(unsafe) throws@this(unsafe)
			super(object);
			this.mock = mock;
		}

		get(target, key, receiver) {
			if (key === 'isProxy') return true;
			// Note: target@this(unsafe) key@prim receiver@this(unsafe) throws@this(unsafe)
			const object = getHandlerObject(this); // @other(unsafe)
			const mock = this.mock;
			if (thisReflectApply(thisObjectHasOwnProperty, mock, key) && !thisOtherHasOwnProperty(object, key)) {
				return mock[key];
			}
			return super.get(target, key, receiver);
		}

	}

	function thisFromOther(other) {
		// Note: other@other(unsafe) returns@this(unsafe) throws@this(unsafe)
		return thisFromOtherWithFactory(defaultFactory, other);
	}

	function thisProxyOther(factory, other, proto, preventUnwrap) {
		const target = thisCreateTargetObject(other, proto);
		const handler = factory(other);
		const proxy = new ThisProxy(target, handler);
		try {
			if (!preventUnwrap) {
				otherReflectApply(otherWeakMapSet, mappingThisToOther, [proxy, other]);
			}
			registerProxy(proxy, handler);
		} catch (e) {
			throw new VMError('Unexpected error');
		}
		if (!isHost) {
			thisReflectApply(thisWeakMapSet, mappingOtherToThis, [other, proxy]);
			return proxy;
		}
		const proxy2 = new ThisProxy(proxy, emptyFrozenObject);
		try {
			otherReflectApply(otherWeakMapSet, mappingThisToOther, [proxy2, other]);
			registerProxy(proxy2, handler);
		} catch (e) {
			throw new VMError('Unexpected error');
		}
		thisReflectApply(thisWeakMapSet, mappingOtherToThis, [other, proxy2]);
		return proxy2;
	}

	function thisEnsureThis(other) {
		const type = typeof other;
		switch (type) {
			case 'object':
				if (other === null) {
					return null;
				}
				// fallthrough
			case 'function':
				let proto = thisReflectGetPrototypeOf(other);
				if (!proto) {
					return other;
				}
				while (proto) {
					const mapping = thisReflectApply(thisMapGet, protoMappings, [proto]);
					if (mapping) {
						const mapped = thisReflectApply(thisWeakMapGet, mappingOtherToThis, [other]);
						if (mapped) return mapped;
						return mapping(defaultFactory, other);
					}
					proto = thisReflectGetPrototypeOf(proto);
				}
				return other;
			case 'undefined':
			case 'string':
			case 'number':
			case 'boolean':
			case 'symbol':
			case 'bigint':
				return other;

			default: // new, unknown types can be dangerous
				throw new VMError(`Unknown type '${type}'`);
		}
	}

	function thisFromOtherForThrow(other) {
		for (let loop = 0; loop < 10; loop++) {
			const type = typeof other;
			switch (type) {
				case 'object':
					if (other === null) {
						return null;
					}
					// fallthrough
				case 'function':
					const mapped = thisReflectApply(thisWeakMapGet, mappingOtherToThis, [other]);
					if (mapped) return mapped;
					let proto;
					try {
						proto = otherReflectGetPrototypeOf(other);
					} catch (e) { // @other(unsafe)
						other = e;
						break;
					}
					if (!proto) {
						return thisProxyOther(defaultFactory, other, null);
					}
					for (;;) {
						const mapping = thisReflectApply(thisMapGet, protoMappings, [proto]);
						if (mapping) return mapping(defaultFactory, other);
						try {
							proto = otherReflectGetPrototypeOf(proto);
						} catch (e) { // @other(unsafe)
							other = e;
							break;
						}
						if (!proto) return thisProxyOther(defaultFactory, other, thisObjectPrototype);
					}
					break;
				case 'undefined':
				case 'string':
				case 'number':
				case 'boolean':
				case 'symbol':
				case 'bigint':
					return other;

				default: // new, unknown types can be dangerous
					throw new VMError(`Unknown type '${type}'`);
			}
		}
		throw new VMError('Exception recursion depth');
	}

	function thisFromOtherWithFactory(factory, other, proto) {
		const type = typeof other;
		switch (type) {
			case 'object':
				if (other === null) {
					return null;
				}
				// fallthrough
			case 'function':
				// Block the other realm's Function constructors from crossing the bridge.
				if (!isHost && isDangerousFunctionConstructor(other)) {
					return emptyFrozenObject;
				}
				// Cache check first — if already proxied, return existing proxy.
				// Safe because: cached proxies were created under the same preventUnwrap
				// rules, and an attacker can't retroactively add Function constructors
				// to a host object's properties from the sandbox (chicken-and-egg).
				const mapped = thisReflectApply(thisWeakMapGet, mappingOtherToThis, [other]);
				if (mapped) return mapped;
				// For objects on sandbox side, check for nested dangerous constructors.
				// If found, proxy WITHOUT unwrap registration (mappingThisToOther), so
				// the proxy cannot be unwrapped when passed back to host functions.
				// The proxy's get trap already sanitizes dangerous values on read.
				const dangerous = !isHost && containsDangerousConstructor(other);
				if (proto) {
					return thisProxyOther(factory, other, proto, dangerous);
				}
				try {
					proto = otherReflectGetPrototypeOf(other);
				} catch (e) { // @other(unsafe)
					throw thisFromOtherForThrow(e);
				}
				if (!proto) {
					return thisProxyOther(factory, other, null, dangerous);
				}
				do {
					const mapping = thisReflectApply(thisMapGet, protoMappings, [proto]);
					if (mapping) return mapping(factory, other, dangerous);
					try {
						proto = otherReflectGetPrototypeOf(proto);
					} catch (e) { // @other(unsafe)
						throw thisFromOtherForThrow(e);
					}
				} while (proto);
				return thisProxyOther(factory, other, thisObjectPrototype, dangerous);
			case 'undefined':
			case 'string':
			case 'number':
			case 'boolean':
			case 'symbol':
			case 'bigint':
				return other;

			default: // new, unknown types can be dangerous
				throw new VMError(`Unknown type '${type}'`);
		}
	}

	function thisFromOtherArguments(args) {
		// Note: args@other(safe-array) returns@this(safe-array) throws@this(unsafe)
		const arr = [];
		for (let i = 0; i < args.length; i++) {
			const value = thisFromOther(args[i]);
			thisReflectDefineProperty(arr, i, {
				__proto__: null,
				value: value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
		return arr;
	}

	function thisConnect(obj, other) {
		// Note: obj@this(unsafe) other@other(unsafe) throws@this(unsafe)
		try {
			otherReflectApply(otherWeakMapSet, mappingThisToOther, [obj, other]);
		} catch (e) {
			throw new VMError('Unexpected error');
		}
		thisReflectApply(thisWeakMapSet, mappingOtherToThis, [other, obj]);
	}

	thisAddProtoMapping(thisGlobalPrototypes.Object, otherGlobalPrototypes.Object);
	thisAddProtoMapping(thisGlobalPrototypes.Array, otherGlobalPrototypes.Array);

	for (let i = 0; i < globalsList.length; i++) {
		const key = globalsList[i];
		const tp = thisGlobalPrototypes[key];
		const op = otherGlobalPrototypes[key];
		if (tp && op) thisAddProtoMapping(tp, op, key);
	}

	for (let i = 0; i < errorsList.length; i++) {
		const key = errorsList[i];
		const tp = thisGlobalPrototypes[key];
		const op = otherGlobalPrototypes[key];
		if (tp && op) thisAddProtoMapping(tp, op, 'Error');
	}

	thisAddProtoMapping(thisGlobalPrototypes.VMError, otherGlobalPrototypes.VMError, 'Error');

	result.BaseHandler = BaseHandler;
	result.ProtectedHandler = ProtectedHandler;
	result.ReadOnlyHandler = ReadOnlyHandler;
	result.ReadOnlyMockHandler = ReadOnlyMockHandler;

	return result;
}

exports.createBridge = createBridge;
exports.VMError = VMError;
