//#region ../../../node_modules/.pnpm/@jitl+quickjs-ffi-types@0.32.0/node_modules/@jitl/quickjs-ffi-types/dist/index.mjs
var EvalFlags = {
	JS_EVAL_TYPE_GLOBAL: 0,
	JS_EVAL_TYPE_MODULE: 1,
	JS_EVAL_TYPE_DIRECT: 2,
	JS_EVAL_TYPE_INDIRECT: 3,
	JS_EVAL_TYPE_MASK: 3,
	JS_EVAL_FLAG_STRICT: 8,
	JS_EVAL_FLAG_STRIP: 16,
	JS_EVAL_FLAG_COMPILE_ONLY: 32,
	JS_EVAL_FLAG_BACKTRACE_BARRIER: 64
};
var IntrinsicsFlags = {
	BaseObjects: 1,
	Date: 2,
	Eval: 4,
	StringNormalize: 8,
	RegExp: 16,
	RegExpCompiler: 32,
	JSON: 64,
	Proxy: 128,
	MapSet: 256,
	TypedArrays: 512,
	Promise: 1024,
	BigInt: 2048,
	BigFloat: 4096,
	BigDecimal: 8192,
	OperatorOverloading: 16384,
	BignumExt: 32768
};
var JSPromiseStateEnum = {
	Pending: 0,
	Fulfilled: 1,
	Rejected: 2
};
var GetOwnPropertyNamesFlags = {
	JS_GPN_STRING_MASK: 1,
	JS_GPN_SYMBOL_MASK: 2,
	JS_GPN_PRIVATE_MASK: 4,
	JS_GPN_ENUM_ONLY: 16,
	JS_GPN_SET_ENUM: 32,
	QTS_GPN_NUMBER_MASK: 64,
	QTS_STANDARD_COMPLIANT_NUMBER: 128
};
var IsEqualOp = {
	IsStrictlyEqual: 0,
	IsSameValue: 1,
	IsSameValueZero: 2
};
//#endregion
//#region ../../../node_modules/.pnpm/quickjs-emscripten-core@0.32.0/node_modules/quickjs-emscripten-core/dist/chunk-V2S4ZYJR.mjs
var __defProp = Object.defineProperty;
var __export = (target, all) => {
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: !0
	});
};
var QTS_DEBUG = !1;
function debugLog(...args) {}
var errors_exports = {};
__export(errors_exports, {
	QuickJSAsyncifyError: () => QuickJSAsyncifyError,
	QuickJSAsyncifySuspended: () => QuickJSAsyncifySuspended,
	QuickJSEmptyGetOwnPropertyNames: () => QuickJSEmptyGetOwnPropertyNames,
	QuickJSEmscriptenModuleError: () => QuickJSEmscriptenModuleError,
	QuickJSHostRefInvalid: () => QuickJSHostRefInvalid,
	QuickJSHostRefRangeExceeded: () => QuickJSHostRefRangeExceeded,
	QuickJSMemoryLeakDetected: () => QuickJSMemoryLeakDetected,
	QuickJSNotImplemented: () => QuickJSNotImplemented,
	QuickJSPromisePending: () => QuickJSPromisePending,
	QuickJSUnknownIntrinsic: () => QuickJSUnknownIntrinsic,
	QuickJSUnwrapError: () => QuickJSUnwrapError,
	QuickJSUseAfterFree: () => QuickJSUseAfterFree,
	QuickJSWrongOwner: () => QuickJSWrongOwner
});
var QuickJSUnwrapError = class extends Error {
	constructor(cause, context) {
		let message = typeof cause == "object" && cause && "message" in cause ? String(cause.message) : String(cause);
		super(message);
		this.cause = cause;
		this.context = context;
		this.name = "QuickJSUnwrapError";
	}
};
var QuickJSWrongOwner = class extends Error {
	constructor() {
		super(...arguments);
		this.name = "QuickJSWrongOwner";
	}
};
var QuickJSUseAfterFree = class extends Error {
	constructor() {
		super(...arguments);
		this.name = "QuickJSUseAfterFree";
	}
};
var QuickJSNotImplemented = class extends Error {
	constructor() {
		super(...arguments);
		this.name = "QuickJSNotImplemented";
	}
};
var QuickJSAsyncifyError = class extends Error {
	constructor() {
		super(...arguments);
		this.name = "QuickJSAsyncifyError";
	}
};
var QuickJSAsyncifySuspended = class extends Error {
	constructor() {
		super(...arguments);
		this.name = "QuickJSAsyncifySuspended";
	}
};
var QuickJSMemoryLeakDetected = class extends Error {
	constructor() {
		super(...arguments);
		this.name = "QuickJSMemoryLeakDetected";
	}
};
var QuickJSEmscriptenModuleError = class extends Error {
	constructor() {
		super(...arguments);
		this.name = "QuickJSEmscriptenModuleError";
	}
};
var QuickJSUnknownIntrinsic = class extends TypeError {
	constructor() {
		super(...arguments);
		this.name = "QuickJSUnknownIntrinsic";
	}
};
var QuickJSPromisePending = class extends Error {
	constructor() {
		super(...arguments);
		this.name = "QuickJSPromisePending";
	}
};
var QuickJSEmptyGetOwnPropertyNames = class extends Error {
	constructor() {
		super(...arguments);
		this.name = "QuickJSEmptyGetOwnPropertyNames";
	}
};
var QuickJSHostRefRangeExceeded = class extends Error {
	constructor() {
		super(...arguments);
		this.name = "QuickJSHostRefRangeExceeded";
	}
};
var QuickJSHostRefInvalid = class extends Error {
	constructor() {
		super(...arguments);
		this.name = "QuickJSHostRefInvalid";
	}
};
function* awaitYield(value) {
	return yield value;
}
function awaitYieldOf(generator) {
	return awaitYield(awaitEachYieldedPromise(generator));
}
var AwaitYield = awaitYield;
AwaitYield.of = awaitYieldOf;
function maybeAsyncFn(that, fn) {
	return (...args) => {
		return awaitEachYieldedPromise(fn.call(that, AwaitYield, ...args));
	};
}
function maybeAsync(that, startGenerator) {
	return awaitEachYieldedPromise(startGenerator.call(that, AwaitYield));
}
function awaitEachYieldedPromise(gen) {
	function handleNextStep(step) {
		return step.done ? step.value : step.value instanceof Promise ? step.value.then((value) => handleNextStep(gen.next(value)), (error) => handleNextStep(gen.throw(error))) : handleNextStep(gen.next(step.value));
	}
	return handleNextStep(gen.next());
}
var UsingDisposable = class {
	[Symbol.dispose]() {
		return this.dispose();
	}
};
var SymbolDispose = Symbol.dispose ?? Symbol.for("Symbol.dispose");
var prototypeAsAny = UsingDisposable.prototype;
prototypeAsAny[SymbolDispose] || (prototypeAsAny[SymbolDispose] = function() {
	return this.dispose();
});
var Lifetime = class _Lifetime extends UsingDisposable {
	constructor(_value, copier, disposer, _owner) {
		super();
		this._value = _value;
		this.copier = copier;
		this.disposer = disposer;
		this._owner = _owner;
		this._alive = !0;
		this._constructorStack = QTS_DEBUG ? (/* @__PURE__ */ new Error("Lifetime constructed")).stack : void 0;
	}
	get alive() {
		return this._alive;
	}
	get value() {
		return this.assertAlive(), this._value;
	}
	get owner() {
		return this._owner;
	}
	get dupable() {
		return !!this.copier;
	}
	dup() {
		if (this.assertAlive(), !this.copier) throw new Error("Non-dupable lifetime");
		return new _Lifetime(this.copier(this._value), this.copier, this.disposer, this._owner);
	}
	consume(map) {
		this.assertAlive();
		let result = map(this);
		return this.dispose(), result;
	}
	map(map) {
		return this.assertAlive(), map(this);
	}
	tap(fn) {
		return fn(this), this;
	}
	dispose() {
		this.assertAlive(), this.disposer && this.disposer(this._value), this._alive = !1;
	}
	assertAlive() {
		if (!this.alive) throw this._constructorStack ? new QuickJSUseAfterFree(`Lifetime not alive
${this._constructorStack}
Lifetime used`) : new QuickJSUseAfterFree("Lifetime not alive");
	}
};
var StaticLifetime = class extends Lifetime {
	constructor(value, owner) {
		super(value, void 0, void 0, owner);
	}
	get dupable() {
		return !0;
	}
	dup() {
		return this;
	}
	dispose() {}
};
var WeakLifetime = class extends Lifetime {
	constructor(value, copier, disposer, owner) {
		super(value, copier, disposer, owner);
	}
	dispose() {
		this._alive = !1;
	}
};
function scopeFinally(scope, blockError) {
	let disposeError;
	try {
		scope.dispose();
	} catch (error) {
		disposeError = error;
	}
	if (blockError && disposeError) throw Object.assign(blockError, {
		message: `${blockError.message}
 Then, failed to dispose scope: ${disposeError.message}`,
		disposeError
	}), blockError;
	if (blockError || disposeError) throw blockError || disposeError;
}
var Scope = class _Scope extends UsingDisposable {
	constructor() {
		super(...arguments);
		this._disposables = new Lifetime(/* @__PURE__ */ new Set());
		this.manage = (lifetime) => (this._disposables.value.add(lifetime), lifetime);
	}
	static withScope(block) {
		let scope = new _Scope(), blockError;
		try {
			return block(scope);
		} catch (error) {
			throw blockError = error, error;
		} finally {
			scopeFinally(scope, blockError);
		}
	}
	static withScopeMaybeAsync(_this, block) {
		return maybeAsync(void 0, function* (awaited) {
			let scope = new _Scope(), blockError;
			try {
				return yield* awaited.of(block.call(_this, awaited, scope));
			} catch (error) {
				throw blockError = error, error;
			} finally {
				scopeFinally(scope, blockError);
			}
		});
	}
	static async withScopeAsync(block) {
		let scope = new _Scope(), blockError;
		try {
			return await block(scope);
		} catch (error) {
			throw blockError = error, error;
		} finally {
			scopeFinally(scope, blockError);
		}
	}
	get alive() {
		return this._disposables.alive;
	}
	dispose() {
		let lifetimes = Array.from(this._disposables.value.values()).reverse();
		for (let lifetime of lifetimes) lifetime.alive && lifetime.dispose();
		this._disposables.dispose();
	}
};
function createDisposableArray(items) {
	let array = items ? Array.from(items) : [];
	function disposeAlive() {
		return array.forEach((disposable) => disposable.alive ? disposable.dispose() : void 0);
	}
	function someIsAlive() {
		return array.some((disposable) => disposable.alive);
	}
	return Object.defineProperty(array, SymbolDispose, {
		configurable: !0,
		enumerable: !1,
		value: disposeAlive
	}), Object.defineProperty(array, "dispose", {
		configurable: !0,
		enumerable: !1,
		value: disposeAlive
	}), Object.defineProperty(array, "alive", {
		configurable: !0,
		enumerable: !1,
		get: someIsAlive
	}), array;
}
function isDisposable(value) {
	return !!(value && (typeof value == "object" || typeof value == "function") && "alive" in value && typeof value.alive == "boolean" && "dispose" in value && typeof value.dispose == "function");
}
var AbstractDisposableResult = class _AbstractDisposableResult extends UsingDisposable {
	static success(value) {
		return new DisposableSuccess(value);
	}
	static fail(error, onUnwrap) {
		return new DisposableFail(error, onUnwrap);
	}
	static is(result) {
		return result instanceof _AbstractDisposableResult;
	}
};
var DisposableSuccess = class extends AbstractDisposableResult {
	constructor(value) {
		super();
		this.value = value;
	}
	get alive() {
		return isDisposable(this.value) ? this.value.alive : !0;
	}
	dispose() {
		isDisposable(this.value) && this.value.dispose();
	}
	unwrap() {
		return this.value;
	}
	unwrapOr(_fallback) {
		return this.value;
	}
};
var DisposableFail = class extends AbstractDisposableResult {
	constructor(error, onUnwrap) {
		super();
		this.error = error;
		this.onUnwrap = onUnwrap;
	}
	get alive() {
		return isDisposable(this.error) ? this.error.alive : !0;
	}
	dispose() {
		isDisposable(this.error) && this.error.dispose();
	}
	unwrap() {
		throw this.onUnwrap(this), this.error;
	}
	unwrapOr(fallback) {
		return fallback;
	}
};
var DisposableResult = AbstractDisposableResult;
var QuickJSDeferredPromise = class extends UsingDisposable {
	constructor(args) {
		super();
		this.resolve = (value) => {
			this.resolveHandle.alive && (this.context.unwrapResult(this.context.callFunction(this.resolveHandle, this.context.undefined, value || this.context.undefined)).dispose(), this.disposeResolvers(), this.onSettled());
		};
		this.reject = (value) => {
			this.rejectHandle.alive && (this.context.unwrapResult(this.context.callFunction(this.rejectHandle, this.context.undefined, value || this.context.undefined)).dispose(), this.disposeResolvers(), this.onSettled());
		};
		this.dispose = () => {
			this.handle.alive && this.handle.dispose(), this.disposeResolvers();
		};
		this.context = args.context, this.owner = args.context.runtime, this.handle = args.promiseHandle, this.settled = new Promise((resolve) => {
			this.onSettled = resolve;
		}), this.resolveHandle = args.resolveHandle, this.rejectHandle = args.rejectHandle;
	}
	get alive() {
		return this.handle.alive || this.resolveHandle.alive || this.rejectHandle.alive;
	}
	disposeResolvers() {
		this.resolveHandle.alive && this.resolveHandle.dispose(), this.rejectHandle.alive && this.rejectHandle.dispose();
	}
};
var ModuleMemory = class {
	constructor(module) {
		this.module = module;
	}
	toPointerArray(handleArray) {
		let typedArray = new Int32Array(handleArray.map((handle) => handle.value)), numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT, ptr = this.module._malloc(numBytes);
		return new Uint8Array(this.module.HEAPU8.buffer, ptr, numBytes).set(new Uint8Array(typedArray.buffer)), new Lifetime(ptr, void 0, (ptr2) => this.module._free(ptr2));
	}
	newTypedArray(kind, length) {
		let zeros = new kind(new Array(length).fill(0)), numBytes = zeros.length * zeros.BYTES_PER_ELEMENT, ptr = this.module._malloc(numBytes), typedArray = new kind(this.module.HEAPU8.buffer, ptr, length);
		return typedArray.set(zeros), new Lifetime({
			typedArray,
			ptr
		}, void 0, (value) => this.module._free(value.ptr));
	}
	newMutablePointerArray(length) {
		return this.newTypedArray(Int32Array, length);
	}
	newHeapCharPointer(string) {
		let strlen = this.module.lengthBytesUTF8(string), dataBytes = strlen + 1, ptr = this.module._malloc(dataBytes);
		return this.module.stringToUTF8(string, ptr, dataBytes), new Lifetime({
			ptr,
			strlen
		}, void 0, (value) => this.module._free(value.ptr));
	}
	newHeapBufferPointer(buffer) {
		let numBytes = buffer.byteLength, ptr = this.module._malloc(numBytes);
		return this.module.HEAPU8.set(buffer, ptr), new Lifetime({
			pointer: ptr,
			numBytes
		}, void 0, (value) => this.module._free(value.pointer));
	}
	consumeHeapCharPointer(ptr) {
		let str = this.module.UTF8ToString(ptr);
		return this.module._free(ptr), str;
	}
};
Object.freeze({
	BaseObjects: !0,
	Date: !0,
	Eval: !0,
	StringNormalize: !0,
	RegExp: !0,
	JSON: !0,
	Proxy: !0,
	MapSet: !0,
	TypedArrays: !0,
	Promise: !0
});
function intrinsicsToFlags(intrinsics) {
	if (!intrinsics) return 0;
	let result = 0;
	for (let [maybeIntrinsicName, enabled] of Object.entries(intrinsics)) {
		if (!(maybeIntrinsicName in IntrinsicsFlags)) throw new QuickJSUnknownIntrinsic(maybeIntrinsicName);
		enabled && (result |= IntrinsicsFlags[maybeIntrinsicName]);
	}
	return result;
}
function evalOptionsToFlags(evalOptions) {
	if (typeof evalOptions == "number") return evalOptions;
	if (evalOptions === void 0) return 0;
	let { type, strict, strip, compileOnly, backtraceBarrier } = evalOptions, flags = 0;
	return type === "global" && (flags |= EvalFlags.JS_EVAL_TYPE_GLOBAL), type === "module" && (flags |= EvalFlags.JS_EVAL_TYPE_MODULE), strict && (flags |= EvalFlags.JS_EVAL_FLAG_STRICT), strip && (flags |= EvalFlags.JS_EVAL_FLAG_STRIP), compileOnly && (flags |= EvalFlags.JS_EVAL_FLAG_COMPILE_ONLY), backtraceBarrier && (flags |= EvalFlags.JS_EVAL_FLAG_BACKTRACE_BARRIER), flags;
}
function getOwnPropertyNamesOptionsToFlags(options) {
	if (typeof options == "number") return options;
	if (options === void 0) return 0;
	let { strings: includeStrings, symbols: includeSymbols, quickjsPrivate: includePrivate, onlyEnumerable, numbers: includeNumbers, numbersAsStrings } = options, flags = 0;
	return includeStrings && (flags |= GetOwnPropertyNamesFlags.JS_GPN_STRING_MASK), includeSymbols && (flags |= GetOwnPropertyNamesFlags.JS_GPN_SYMBOL_MASK), includePrivate && (flags |= GetOwnPropertyNamesFlags.JS_GPN_PRIVATE_MASK), onlyEnumerable && (flags |= GetOwnPropertyNamesFlags.JS_GPN_ENUM_ONLY), includeNumbers && (flags |= GetOwnPropertyNamesFlags.QTS_GPN_NUMBER_MASK), numbersAsStrings && (flags |= GetOwnPropertyNamesFlags.QTS_STANDARD_COMPLIANT_NUMBER), flags;
}
function concat(...values) {
	let result = [];
	for (let value of values) value !== void 0 && (result = result.concat(value));
	return result;
}
var QuickJSIterator = class extends UsingDisposable {
	constructor(handle, context) {
		super();
		this.handle = handle;
		this.context = context;
		this._isDone = !1;
		this.owner = context.runtime;
	}
	[Symbol.iterator]() {
		return this;
	}
	next(value) {
		if (!this.alive || this._isDone) return {
			done: !0,
			value: void 0
		};
		let nextMethod = this._next ?? (this._next = this.context.getProp(this.handle, "next"));
		return this.callIteratorMethod(nextMethod, value);
	}
	return(value) {
		if (!this.alive) return {
			done: !0,
			value: void 0
		};
		let returnMethod = this.context.getProp(this.handle, "return");
		if (returnMethod === this.context.undefined && value === void 0) return this.dispose(), {
			done: !0,
			value: void 0
		};
		let result = this.callIteratorMethod(returnMethod, value);
		return returnMethod.dispose(), this.dispose(), result;
	}
	throw(e) {
		if (!this.alive) return {
			done: !0,
			value: void 0
		};
		let errorHandle = e instanceof Lifetime ? e : this.context.newError(e), throwMethod = this.context.getProp(this.handle, "throw"), result = this.callIteratorMethod(throwMethod, e);
		return errorHandle.alive && errorHandle.dispose(), throwMethod.dispose(), this.dispose(), result;
	}
	get alive() {
		return this.handle.alive;
	}
	dispose() {
		this._isDone = !0, this.handle.dispose(), this._next?.dispose();
	}
	callIteratorMethod(method, input) {
		let callResult = input ? this.context.callFunction(method, this.handle, input) : this.context.callFunction(method, this.handle);
		if (callResult.error) return this.dispose(), { value: callResult };
		let done = this.context.getProp(callResult.value, "done").consume((v) => this.context.dump(v)), value = this.context.getProp(callResult.value, "value");
		return callResult.value.dispose(), done && this.dispose(), {
			value: DisposableResult.success(value),
			done
		};
	}
};
var INT32_MIN = -2147483648;
var INT32_MAX = 2147483647;
var INVALID_HOST_REF_ID = 0;
function getGroupId(id) {
	return id >> 8;
}
var HostRefMap = class {
	constructor() {
		this.nextId = INT32_MIN;
		this.freelist = [];
		this.groups = /* @__PURE__ */ new Map();
	}
	put(value) {
		let id = this.allocateId(), groupId = getGroupId(id), group = this.groups.get(groupId);
		return group || (group = /* @__PURE__ */ new Map(), this.groups.set(groupId, group)), group.set(id, value), id;
	}
	get(id) {
		if (id === INVALID_HOST_REF_ID) throw new QuickJSHostRefInvalid("no host reference id defined");
		let groupId = getGroupId(id), group = this.groups.get(groupId);
		if (!group) throw new QuickJSHostRefInvalid(`host reference id ${id} is not defined`);
		let value = group.get(id);
		if (!value) throw new QuickJSHostRefInvalid(`host reference id ${id} is not defined`);
		return value;
	}
	delete(id) {
		if (id === INVALID_HOST_REF_ID) throw new QuickJSHostRefInvalid("no host reference id defined");
		let groupId = getGroupId(id), group = this.groups.get(groupId);
		if (!group) throw new QuickJSHostRefInvalid(`host reference id ${id} is not defined`);
		group.delete(id), group.size === 0 && this.groups.delete(groupId), this.freelist.push(id);
	}
	allocateId() {
		if (this.freelist.length > 0) return this.freelist.shift();
		if (this.nextId === INVALID_HOST_REF_ID && this.nextId++, this.nextId > INT32_MAX) throw new QuickJSHostRefRangeExceeded(`HostRefMap: too many host refs created without disposing. Max simultaneous host refs: ${INT32_MAX - INT32_MIN}`);
		return this.nextId++;
	}
};
var HostRef = class extends UsingDisposable {
	constructor(runtime, handle, id) {
		if (id === INVALID_HOST_REF_ID) throw new QuickJSHostRefInvalid("cannot create HostRef with undefined id");
		super();
		this.runtime = runtime;
		this.handle = handle;
		this.id = id;
	}
	get alive() {
		return this.handle.alive;
	}
	dispose() {
		this.handle.dispose();
	}
	get value() {
		return this.runtime.hostRefs.get(this.id);
	}
};
var ContextMemory = class extends ModuleMemory {
	constructor(args) {
		super(args.module);
		this.scope = new Scope();
		this.copyJSValue = (ptr) => this.ffi.QTS_DupValuePointer(this.ctx.value, ptr);
		this.freeJSValue = (ptr) => {
			this.ffi.QTS_FreeValuePointer(this.ctx.value, ptr);
		};
		args.ownedLifetimes?.forEach((lifetime) => this.scope.manage(lifetime)), this.owner = args.owner, this.module = args.module, this.ffi = args.ffi, this.rt = args.rt, this.ctx = this.scope.manage(args.ctx);
	}
	get alive() {
		return this.scope.alive;
	}
	dispose() {
		return this.scope.dispose();
	}
	[Symbol.dispose]() {
		return this.dispose();
	}
	manage(lifetime) {
		return this.scope.manage(lifetime);
	}
	consumeJSCharPointer(ptr) {
		let str = this.module.UTF8ToString(ptr);
		return this.ffi.QTS_FreeCString(this.ctx.value, ptr), str;
	}
	heapValueHandle(ptr, extraDispose) {
		let dispose = extraDispose ? (val) => {
			extraDispose(), this.freeJSValue(val);
		} : this.freeJSValue;
		return new Lifetime(ptr, this.copyJSValue, dispose, this.owner);
	}
	staticHeapValueHandle(ptr) {
		return this.manage(this.heapValueHandle(ptr)), new StaticLifetime(ptr, this.owner);
	}
};
var QuickJSContext = class extends UsingDisposable {
	constructor(args) {
		super();
		this._undefined = void 0;
		this._null = void 0;
		this._false = void 0;
		this._true = void 0;
		this._global = void 0;
		this._BigInt = void 0;
		this._Symbol = void 0;
		this._SymbolIterator = void 0;
		this._SymbolAsyncIterator = void 0;
		this.cToHostCallbacks = { callFunction: (ctx, this_ptr, argc, argv, fn_id) => {
			if (ctx !== this.ctx.value) throw new Error("QuickJSContext instance received C -> JS call with mismatched ctx");
			let fn = this.getFunction(fn_id);
			return Scope.withScopeMaybeAsync(this, function* (awaited, scope) {
				let thisHandle = scope.manage(new WeakLifetime(this_ptr, this.memory.copyJSValue, this.memory.freeJSValue, this.runtime)), argHandles = new Array(argc);
				for (let i = 0; i < argc; i++) {
					let ptr = this.ffi.QTS_ArgvGetJSValueConstPointer(argv, i);
					argHandles[i] = scope.manage(new WeakLifetime(ptr, this.memory.copyJSValue, this.memory.freeJSValue, this.runtime));
				}
				try {
					let result = yield* awaited(fn.apply(thisHandle, argHandles));
					if (result) {
						if ("error" in result && result.error) throw this.runtime.debugLog("throw error", result.error), result.error;
						let handle = scope.manage(result instanceof Lifetime ? result : result.value);
						return this.ffi.QTS_DupValuePointer(this.ctx.value, handle.value);
					}
					return 0;
				} catch (error) {
					return this.errorToHandle(error).consume((errorHandle) => this.ffi.QTS_Throw(this.ctx.value, errorHandle.value));
				}
			});
		} };
		this.runtime = args.runtime, this.module = args.module, this.ffi = args.ffi, this.rt = args.rt, this.ctx = args.ctx, this.memory = new ContextMemory({
			...args,
			owner: this.runtime
		}), args.callbacks.setContextCallbacks(this.ctx.value, this.cToHostCallbacks), this.dump = this.dump.bind(this), this.getString = this.getString.bind(this), this.getNumber = this.getNumber.bind(this), this.resolvePromise = this.resolvePromise.bind(this), this.uint32Out = this.memory.manage(this.memory.newTypedArray(Uint32Array, 1));
	}
	get alive() {
		return this.memory.alive;
	}
	dispose() {
		this.memory.dispose();
	}
	get undefined() {
		if (this._undefined) return this._undefined;
		let ptr = this.ffi.QTS_GetUndefined();
		return this._undefined = new StaticLifetime(ptr);
	}
	get null() {
		if (this._null) return this._null;
		let ptr = this.ffi.QTS_GetNull();
		return this._null = new StaticLifetime(ptr);
	}
	get true() {
		if (this._true) return this._true;
		let ptr = this.ffi.QTS_GetTrue();
		return this._true = new StaticLifetime(ptr);
	}
	get false() {
		if (this._false) return this._false;
		let ptr = this.ffi.QTS_GetFalse();
		return this._false = new StaticLifetime(ptr);
	}
	get global() {
		if (this._global) return this._global;
		let ptr = this.ffi.QTS_GetGlobalObject(this.ctx.value);
		return this._global = this.memory.staticHeapValueHandle(ptr), this._global;
	}
	newNumber(num) {
		return this.memory.heapValueHandle(this.ffi.QTS_NewFloat64(this.ctx.value, num));
	}
	newString(str) {
		let ptr = this.memory.newHeapCharPointer(str).consume((charHandle) => this.ffi.QTS_NewString(this.ctx.value, charHandle.value.ptr));
		return this.memory.heapValueHandle(ptr);
	}
	newUniqueSymbol(description) {
		let key = (typeof description == "symbol" ? description.description : description) ?? "", ptr = this.memory.newHeapCharPointer(key).consume((charHandle) => this.ffi.QTS_NewSymbol(this.ctx.value, charHandle.value.ptr, 0));
		return this.memory.heapValueHandle(ptr);
	}
	newSymbolFor(key) {
		let description = (typeof key == "symbol" ? key.description : key) ?? "", ptr = this.memory.newHeapCharPointer(description).consume((charHandle) => this.ffi.QTS_NewSymbol(this.ctx.value, charHandle.value.ptr, 1));
		return this.memory.heapValueHandle(ptr);
	}
	getWellKnownSymbol(name) {
		return this._Symbol ?? (this._Symbol = this.memory.manage(this.getProp(this.global, "Symbol"))), this.getProp(this._Symbol, name);
	}
	newBigInt(num) {
		if (!this._BigInt) {
			let bigIntHandle2 = this.getProp(this.global, "BigInt");
			this.memory.manage(bigIntHandle2), this._BigInt = new StaticLifetime(bigIntHandle2.value, this.runtime);
		}
		let bigIntHandle = this._BigInt, asString = String(num);
		return this.newString(asString).consume((handle) => this.unwrapResult(this.callFunction(bigIntHandle, this.undefined, handle)));
	}
	newObject(prototype) {
		prototype && this.runtime.assertOwned(prototype);
		let ptr = prototype ? this.ffi.QTS_NewObjectProto(this.ctx.value, prototype.value) : this.ffi.QTS_NewObject(this.ctx.value);
		return this.memory.heapValueHandle(ptr);
	}
	newArray() {
		let ptr = this.ffi.QTS_NewArray(this.ctx.value);
		return this.memory.heapValueHandle(ptr);
	}
	newArrayBuffer(buffer) {
		let array = new Uint8Array(buffer), handle = this.memory.newHeapBufferPointer(array), ptr = this.ffi.QTS_NewArrayBuffer(this.ctx.value, handle.value.pointer, array.length);
		return this.memory.heapValueHandle(ptr);
	}
	newPromise(value) {
		let deferredPromise = Scope.withScope((scope) => {
			let mutablePointerArray = scope.manage(this.memory.newMutablePointerArray(2)), promisePtr = this.ffi.QTS_NewPromiseCapability(this.ctx.value, mutablePointerArray.value.ptr), promiseHandle = this.memory.heapValueHandle(promisePtr), [resolveHandle, rejectHandle] = Array.from(mutablePointerArray.value.typedArray).map((jsvaluePtr) => this.memory.heapValueHandle(jsvaluePtr));
			return new QuickJSDeferredPromise({
				context: this,
				promiseHandle,
				resolveHandle,
				rejectHandle
			});
		});
		return value && typeof value == "function" && (value = new Promise(value)), value && Promise.resolve(value).then(deferredPromise.resolve, (error) => error instanceof Lifetime ? deferredPromise.reject(error) : this.newError(error).consume(deferredPromise.reject)), deferredPromise;
	}
	newFunction(nameOrFn, maybeFn) {
		let fn = typeof nameOrFn == "function" ? nameOrFn : maybeFn;
		if (!fn) throw new TypeError("Expected a function");
		return this.newFunctionWithOptions({
			name: typeof nameOrFn == "string" ? nameOrFn : void 0,
			length: fn.length,
			isConstructor: !1,
			fn
		});
	}
	newConstructorFunction(nameOrFn, maybeFn) {
		let fn = typeof nameOrFn == "function" ? nameOrFn : maybeFn;
		if (!fn) throw new TypeError("Expected a function");
		return this.newFunctionWithOptions({
			name: typeof nameOrFn == "string" ? nameOrFn : void 0,
			length: fn.length,
			isConstructor: !0,
			fn
		});
	}
	newFunctionWithOptions(args) {
		let { name, length, isConstructor, fn } = args, refId = this.runtime.hostRefs.put(fn);
		try {
			return this.memory.heapValueHandle(this.ffi.QTS_NewFunction(this.ctx.value, name ?? "", length, isConstructor, refId));
		} catch (error) {
			throw this.runtime.hostRefs.delete(refId), error;
		}
	}
	newError(error) {
		let errorHandle = this.memory.heapValueHandle(this.ffi.QTS_NewError(this.ctx.value));
		return error && typeof error == "object" ? (error.name !== void 0 && this.newString(error.name).consume((handle) => this.setProp(errorHandle, "name", handle)), error.message !== void 0 && this.newString(error.message).consume((handle) => this.setProp(errorHandle, "message", handle))) : typeof error == "string" ? this.newString(error).consume((handle) => this.setProp(errorHandle, "message", handle)) : error !== void 0 && this.newString(String(error)).consume((handle) => this.setProp(errorHandle, "message", handle)), errorHandle;
	}
	newHostRef(value) {
		let id = this.runtime.hostRefs.put(value);
		try {
			let handle = this.memory.heapValueHandle(this.ffi.QTS_NewHostRef(this.ctx.value, id));
			return new HostRef(this.runtime, handle, id);
		} catch (error) {
			throw this.runtime.hostRefs.delete(id), error;
		}
	}
	toHostRef(handle) {
		let id = this.ffi.QTS_GetHostRefId(handle.value);
		if (id !== 0) return this.runtime.hostRefs.get(id), new HostRef(this.runtime, handle.dup(), id);
	}
	unwrapHostRef(handle) {
		let id = this.ffi.QTS_GetHostRefId(handle.value);
		if (id === 0) throw new QuickJSHostRefInvalid("handle is not a HostRef");
		return this.runtime.hostRefs.get(id);
	}
	typeof(handle) {
		return this.runtime.assertOwned(handle), this.memory.consumeHeapCharPointer(this.ffi.QTS_Typeof(this.ctx.value, handle.value));
	}
	getNumber(handle) {
		return this.runtime.assertOwned(handle), this.ffi.QTS_GetFloat64(this.ctx.value, handle.value);
	}
	getString(handle) {
		return this.runtime.assertOwned(handle), this.memory.consumeJSCharPointer(this.ffi.QTS_GetString(this.ctx.value, handle.value));
	}
	getSymbol(handle) {
		this.runtime.assertOwned(handle);
		let key = this.memory.consumeJSCharPointer(this.ffi.QTS_GetSymbolDescriptionOrKey(this.ctx.value, handle.value));
		return this.ffi.QTS_IsGlobalSymbol(this.ctx.value, handle.value) ? Symbol.for(key) : Symbol(key);
	}
	getBigInt(handle) {
		this.runtime.assertOwned(handle);
		let asString = this.getString(handle);
		return BigInt(asString);
	}
	getArrayBuffer(handle) {
		this.runtime.assertOwned(handle);
		let len = this.ffi.QTS_GetArrayBufferLength(this.ctx.value, handle.value), ptr = this.ffi.QTS_GetArrayBuffer(this.ctx.value, handle.value);
		if (!ptr) throw new Error("Couldn't allocate memory to get ArrayBuffer");
		return new Lifetime(this.module.HEAPU8.subarray(ptr, ptr + len), void 0, () => this.module._free(ptr));
	}
	getPromiseState(handle) {
		this.runtime.assertOwned(handle);
		let state = this.ffi.QTS_PromiseState(this.ctx.value, handle.value);
		if (state < 0) return {
			type: "fulfilled",
			value: handle,
			notAPromise: !0
		};
		if (state === JSPromiseStateEnum.Pending) return {
			type: "pending",
			get error() {
				return new QuickJSPromisePending("Cannot unwrap a pending promise");
			}
		};
		let ptr = this.ffi.QTS_PromiseResult(this.ctx.value, handle.value), result = this.memory.heapValueHandle(ptr);
		if (state === JSPromiseStateEnum.Fulfilled) return {
			type: "fulfilled",
			value: result
		};
		if (state === JSPromiseStateEnum.Rejected) return {
			type: "rejected",
			error: result
		};
		throw result.dispose(), /* @__PURE__ */ new Error(`Unknown JSPromiseStateEnum: ${state}`);
	}
	resolvePromise(promiseLikeHandle) {
		this.runtime.assertOwned(promiseLikeHandle);
		let vmResolveResult = Scope.withScope((scope) => {
			let vmPromise = scope.manage(this.getProp(this.global, "Promise")), vmPromiseResolve = scope.manage(this.getProp(vmPromise, "resolve"));
			return this.callFunction(vmPromiseResolve, vmPromise, promiseLikeHandle);
		});
		return vmResolveResult.error ? Promise.resolve(vmResolveResult) : new Promise((resolve) => {
			Scope.withScope((scope) => {
				let resolveHandle = scope.manage(this.newFunction("resolve", (value) => {
					resolve(this.success(value && value.dup()));
				})), rejectHandle = scope.manage(this.newFunction("reject", (error) => {
					resolve(this.fail(error && error.dup()));
				})), promiseHandle = scope.manage(vmResolveResult.value), promiseThenHandle = scope.manage(this.getProp(promiseHandle, "then"));
				this.callFunction(promiseThenHandle, promiseHandle, resolveHandle, rejectHandle).unwrap().dispose();
			});
		});
	}
	isEqual(a, b, equalityType = IsEqualOp.IsStrictlyEqual) {
		if (a === b) return !0;
		this.runtime.assertOwned(a), this.runtime.assertOwned(b);
		let result = this.ffi.QTS_IsEqual(this.ctx.value, a.value, b.value, equalityType);
		if (result === -1) throw new QuickJSNotImplemented("WASM variant does not expose equality");
		return !!result;
	}
	eq(handle, other) {
		return this.isEqual(handle, other, IsEqualOp.IsStrictlyEqual);
	}
	sameValue(handle, other) {
		return this.isEqual(handle, other, IsEqualOp.IsSameValue);
	}
	sameValueZero(handle, other) {
		return this.isEqual(handle, other, IsEqualOp.IsSameValueZero);
	}
	getProp(handle, key) {
		this.runtime.assertOwned(handle);
		let ptr;
		return typeof key == "number" && key >= 0 ? ptr = this.ffi.QTS_GetPropNumber(this.ctx.value, handle.value, key) : ptr = this.borrowPropertyKey(key).consume((quickJSKey) => this.ffi.QTS_GetProp(this.ctx.value, handle.value, quickJSKey.value)), this.memory.heapValueHandle(ptr);
	}
	getLength(handle) {
		if (this.runtime.assertOwned(handle), !(this.ffi.QTS_GetLength(this.ctx.value, this.uint32Out.value.ptr, handle.value) < 0)) return this.uint32Out.value.typedArray[0];
	}
	getOwnPropertyNames(handle, options = {
		strings: !0,
		numbersAsStrings: !0
	}) {
		this.runtime.assertOwned(handle), handle.value;
		let flags = getOwnPropertyNamesOptionsToFlags(options);
		if (flags === 0) throw new QuickJSEmptyGetOwnPropertyNames("No options set, will return an empty array");
		return Scope.withScope((scope) => {
			let outPtr = scope.manage(this.memory.newMutablePointerArray(1)), errorPtr = this.ffi.QTS_GetOwnPropertyNames(this.ctx.value, outPtr.value.ptr, this.uint32Out.value.ptr, handle.value, flags);
			if (errorPtr) return this.fail(this.memory.heapValueHandle(errorPtr));
			let len = this.uint32Out.value.typedArray[0], ptr = outPtr.value.typedArray[0], pointerArray = new Uint32Array(this.module.HEAP8.buffer, ptr, len), handles = Array.from(pointerArray).map((ptr2) => this.memory.heapValueHandle(ptr2));
			return this.ffi.QTS_FreeVoidPointer(this.ctx.value, ptr), this.success(createDisposableArray(handles));
		});
	}
	getIterator(iterableHandle) {
		let SymbolIterator = this._SymbolIterator ?? (this._SymbolIterator = this.memory.manage(this.getWellKnownSymbol("iterator")));
		return Scope.withScope((scope) => {
			let methodHandle = scope.manage(this.getProp(iterableHandle, SymbolIterator)), iteratorCallResult = this.callFunction(methodHandle, iterableHandle);
			return iteratorCallResult.error ? iteratorCallResult : this.success(new QuickJSIterator(iteratorCallResult.value, this));
		});
	}
	setProp(handle, key, value) {
		this.runtime.assertOwned(handle), this.borrowPropertyKey(key).consume((quickJSKey) => this.ffi.QTS_SetProp(this.ctx.value, handle.value, quickJSKey.value, value.value));
	}
	defineProp(handle, key, descriptor) {
		this.runtime.assertOwned(handle), Scope.withScope((scope) => {
			let quickJSKey = scope.manage(this.borrowPropertyKey(key)), value = descriptor.value || this.undefined, configurable = !!descriptor.configurable, enumerable = !!descriptor.enumerable, hasValue = !!descriptor.value, get = descriptor.get ? scope.manage(this.newFunction(descriptor.get.name, descriptor.get)) : this.undefined, set = descriptor.set ? scope.manage(this.newFunction(descriptor.set.name, descriptor.set)) : this.undefined;
			this.ffi.QTS_DefineProp(this.ctx.value, handle.value, quickJSKey.value, value.value, get.value, set.value, configurable, enumerable, hasValue);
		});
	}
	callFunction(func, thisVal, ...restArgs) {
		this.runtime.assertOwned(func);
		let args, firstArg = restArgs[0];
		firstArg === void 0 || Array.isArray(firstArg) ? args = firstArg ?? [] : args = restArgs;
		let resultPtr = this.memory.toPointerArray(args).consume((argsArrayPtr) => this.ffi.QTS_Call(this.ctx.value, func.value, thisVal.value, args.length, argsArrayPtr.value)), errorPtr = this.ffi.QTS_ResolveException(this.ctx.value, resultPtr);
		return errorPtr ? (this.ffi.QTS_FreeValuePointer(this.ctx.value, resultPtr), this.fail(this.memory.heapValueHandle(errorPtr))) : this.success(this.memory.heapValueHandle(resultPtr));
	}
	callMethod(thisHandle, key, args = []) {
		return this.getProp(thisHandle, key).consume((func) => this.callFunction(func, thisHandle, args));
	}
	evalCode(code, filename = "eval.js", options) {
		let detectModule = options === void 0 ? 1 : 0, flags = evalOptionsToFlags(options), resultPtr = this.memory.newHeapCharPointer(code).consume((charHandle) => this.ffi.QTS_Eval(this.ctx.value, charHandle.value.ptr, charHandle.value.strlen, filename, detectModule, flags)), errorPtr = this.ffi.QTS_ResolveException(this.ctx.value, resultPtr);
		return errorPtr ? (this.ffi.QTS_FreeValuePointer(this.ctx.value, resultPtr), this.fail(this.memory.heapValueHandle(errorPtr))) : this.success(this.memory.heapValueHandle(resultPtr));
	}
	throw(error) {
		return this.errorToHandle(error).consume((handle) => this.ffi.QTS_Throw(this.ctx.value, handle.value));
	}
	borrowPropertyKey(key) {
		return typeof key == "number" ? this.newNumber(key) : typeof key == "string" ? this.newString(key) : new StaticLifetime(key.value, this.runtime);
	}
	getMemory(rt) {
		if (rt === this.rt.value) return this.memory;
		throw new Error("Private API. Cannot get memory from a different runtime");
	}
	dump(handle) {
		this.runtime.assertOwned(handle);
		let type = this.typeof(handle);
		if (type === "string") return this.getString(handle);
		if (type === "number") return this.getNumber(handle);
		if (type === "bigint") return this.getBigInt(handle);
		if (type === "undefined") return;
		if (type === "symbol") return this.getSymbol(handle);
		let asPromiseState = this.getPromiseState(handle);
		if (asPromiseState.type === "fulfilled" && !asPromiseState.notAPromise) return handle.dispose(), {
			type: asPromiseState.type,
			value: asPromiseState.value.consume(this.dump)
		};
		if (asPromiseState.type === "pending") return handle.dispose(), { type: asPromiseState.type };
		if (asPromiseState.type === "rejected") return handle.dispose(), {
			type: asPromiseState.type,
			error: asPromiseState.error.consume(this.dump)
		};
		let str = this.memory.consumeJSCharPointer(this.ffi.QTS_Dump(this.ctx.value, handle.value));
		try {
			return JSON.parse(str);
		} catch {
			return str;
		}
	}
	unwrapResult(result) {
		if (result.error) {
			let context = "context" in result.error ? result.error.context : this, cause = result.error.consume((error) => this.dump(error));
			if (cause && typeof cause == "object" && typeof cause.message == "string") {
				let { message, name, stack, ...rest } = cause, exception = new QuickJSUnwrapError(cause, context);
				typeof name == "string" && (exception.name = cause.name), exception.message = message;
				let hostStack = exception.stack;
				throw typeof stack == "string" && (exception.stack = `${name}: ${message}
${cause.stack}Host: ${hostStack}`), Object.assign(exception, rest), exception;
			}
			throw new QuickJSUnwrapError(cause);
		}
		return result.value;
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return this.alive ? `${this.constructor.name} { ctx: ${this.ctx.value} rt: ${this.rt.value} }` : `${this.constructor.name} { disposed }`;
	}
	getFunction(fn_id) {
		let fn = this.runtime.hostRefs.get(fn_id);
		if (typeof fn != "function") throw new Error(`Host reference ${fn_id} is not a function`);
		return fn;
	}
	errorToHandle(error) {
		return error instanceof Lifetime ? error : this.newError(error);
	}
	encodeBinaryJSON(handle) {
		let ptr = this.ffi.QTS_bjson_encode(this.ctx.value, handle.value);
		return this.memory.heapValueHandle(ptr);
	}
	decodeBinaryJSON(handle) {
		let ptr = this.ffi.QTS_bjson_decode(this.ctx.value, handle.value);
		return this.memory.heapValueHandle(ptr);
	}
	success(value) {
		return DisposableResult.success(value);
	}
	fail(error) {
		return DisposableResult.fail(error, (error2) => this.unwrapResult(error2));
	}
};
var QuickJSRuntime = class extends UsingDisposable {
	constructor(args) {
		super();
		this.scope = new Scope();
		this.contextMap = /* @__PURE__ */ new Map();
		this.hostRefs = new HostRefMap();
		this._debugMode = !1;
		this.cToHostCallbacks = {
			freeHostRef: (rt, host_ref_id) => {
				if (rt !== this.rt.value) throw new Error("Runtime pointer mismatch");
				this.hostRefs.delete(host_ref_id);
			},
			shouldInterrupt: (rt) => {
				if (rt !== this.rt.value) throw new Error("QuickJSContext instance received C -> JS interrupt with mismatched rt");
				let fn = this.interruptHandler;
				if (!fn) throw new Error("QuickJSContext had no interrupt handler");
				return fn(this) ? 1 : 0;
			},
			loadModuleSource: maybeAsyncFn(this, function* (awaited, rt, ctx, moduleName) {
				let moduleLoader = this.moduleLoader;
				if (!moduleLoader) throw new Error("Runtime has no module loader");
				if (rt !== this.rt.value) throw new Error("Runtime pointer mismatch");
				let context = this.contextMap.get(ctx) ?? this.newContext({ contextPointer: ctx });
				try {
					let result = yield* awaited(moduleLoader(moduleName, context));
					if (typeof result == "object" && "error" in result && result.error) throw this.debugLog("cToHostLoadModule: loader returned error", result.error), result.error;
					let moduleSource = typeof result == "string" ? result : "value" in result ? result.value : result;
					return this.memory.newHeapCharPointer(moduleSource).value.ptr;
				} catch (error) {
					return this.debugLog("cToHostLoadModule: caught error", error), context.throw(error), 0;
				}
			}),
			normalizeModule: maybeAsyncFn(this, function* (awaited, rt, ctx, baseModuleName, moduleNameRequest) {
				let moduleNormalizer = this.moduleNormalizer;
				if (!moduleNormalizer) throw new Error("Runtime has no module normalizer");
				if (rt !== this.rt.value) throw new Error("Runtime pointer mismatch");
				let context = this.contextMap.get(ctx) ?? this.newContext({ contextPointer: ctx });
				try {
					let result = yield* awaited(moduleNormalizer(baseModuleName, moduleNameRequest, context));
					if (typeof result == "object" && "error" in result && result.error) throw this.debugLog("cToHostNormalizeModule: normalizer returned error", result.error), result.error;
					let name = typeof result == "string" ? result : result.value;
					return context.getMemory(this.rt.value).newHeapCharPointer(name).value.ptr;
				} catch (error) {
					return this.debugLog("normalizeModule: caught error", error), context.throw(error), 0;
				}
			})
		};
		args.ownedLifetimes?.forEach((lifetime) => this.scope.manage(lifetime)), this.module = args.module, this.memory = new ModuleMemory(this.module), this.ffi = args.ffi, this.rt = args.rt, this.callbacks = args.callbacks, this.scope.manage(this.rt), this.callbacks.setRuntimeCallbacks(this.rt.value, this.cToHostCallbacks), this.executePendingJobs = this.executePendingJobs.bind(this);
	}
	get alive() {
		return this.scope.alive;
	}
	dispose() {
		return this.scope.dispose();
	}
	newContext(options = {}) {
		let intrinsics = intrinsicsToFlags(options.intrinsics), ctx = new Lifetime(options.contextPointer || this.ffi.QTS_NewContext(this.rt.value, intrinsics), void 0, (ctx_ptr) => {
			this.contextMap.delete(ctx_ptr), this.callbacks.deleteContext(ctx_ptr), this.ffi.QTS_FreeContext(ctx_ptr);
		}), context = new QuickJSContext({
			module: this.module,
			ctx,
			ffi: this.ffi,
			rt: this.rt,
			ownedLifetimes: options.ownedLifetimes,
			runtime: this,
			callbacks: this.callbacks
		});
		return this.contextMap.set(ctx.value, context), context;
	}
	setModuleLoader(moduleLoader, moduleNormalizer) {
		this.moduleLoader = moduleLoader, this.moduleNormalizer = moduleNormalizer, this.ffi.QTS_RuntimeEnableModuleLoader(this.rt.value, this.moduleNormalizer ? 1 : 0);
	}
	removeModuleLoader() {
		this.moduleLoader = void 0, this.ffi.QTS_RuntimeDisableModuleLoader(this.rt.value);
	}
	hasPendingJob() {
		return !!this.ffi.QTS_IsJobPending(this.rt.value);
	}
	setInterruptHandler(cb) {
		let prevInterruptHandler = this.interruptHandler;
		this.interruptHandler = cb, prevInterruptHandler || this.ffi.QTS_RuntimeEnableInterruptHandler(this.rt.value);
	}
	removeInterruptHandler() {
		this.interruptHandler && (this.ffi.QTS_RuntimeDisableInterruptHandler(this.rt.value), this.interruptHandler = void 0);
	}
	executePendingJobs(maxJobsToExecute = -1) {
		let ctxPtrOut = this.memory.newMutablePointerArray(1), valuePtr = this.ffi.QTS_ExecutePendingJob(this.rt.value, maxJobsToExecute ?? -1, ctxPtrOut.value.ptr), ctxPtr = ctxPtrOut.value.typedArray[0];
		if (ctxPtrOut.dispose(), ctxPtr === 0) return this.ffi.QTS_FreeValuePointerRuntime(this.rt.value, valuePtr), DisposableResult.success(0);
		let context = this.contextMap.get(ctxPtr) ?? this.newContext({ contextPointer: ctxPtr }), resultValue = context.getMemory(this.rt.value).heapValueHandle(valuePtr);
		if (context.typeof(resultValue) === "number") {
			let executedJobs = context.getNumber(resultValue);
			return resultValue.dispose(), DisposableResult.success(executedJobs);
		} else {
			let error = Object.assign(resultValue, { context });
			return DisposableResult.fail(error, (error2) => context.unwrapResult(error2));
		}
	}
	setMemoryLimit(limitBytes) {
		if (limitBytes < 0 && limitBytes !== -1) throw new Error("Cannot set memory limit to negative number. To unset, pass -1");
		this.ffi.QTS_RuntimeSetMemoryLimit(this.rt.value, limitBytes);
	}
	computeMemoryUsage() {
		let serviceContextMemory = this.getSystemContext().getMemory(this.rt.value);
		return serviceContextMemory.heapValueHandle(this.ffi.QTS_RuntimeComputeMemoryUsage(this.rt.value, serviceContextMemory.ctx.value));
	}
	dumpMemoryUsage() {
		return this.memory.consumeHeapCharPointer(this.ffi.QTS_RuntimeDumpMemoryUsage(this.rt.value));
	}
	setMaxStackSize(stackSize) {
		if (stackSize < 0) throw new Error("Cannot set memory limit to negative number. To unset, pass 0.");
		this.ffi.QTS_RuntimeSetMaxStackSize(this.rt.value, stackSize);
	}
	assertOwned(handle) {
		if (handle.owner && handle.owner.rt !== this.rt) throw new QuickJSWrongOwner(`Handle is not owned by this runtime: ${handle.owner.rt.value} != ${this.rt.value}`);
	}
	setDebugMode(enabled) {
		this._debugMode = enabled, this.ffi.DEBUG && this.rt.alive && this.ffi.QTS_SetDebugLogEnabled(this.rt.value, enabled ? 1 : 0);
	}
	isDebugMode() {
		return this._debugMode;
	}
	debugLog(...msg) {
		this._debugMode && console.log("quickjs-emscripten:", ...msg);
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return this.alive ? `${this.constructor.name} { rt: ${this.rt.value} }` : `${this.constructor.name} { disposed }`;
	}
	getSystemContext() {
		return this.context || (this.context = this.scope.manage(this.newContext())), this.context;
	}
};
var QuickJSEmscriptenModuleCallbacks = class {
	constructor(args) {
		this.freeHostRef = args.freeHostRef, this.callFunction = args.callFunction, this.shouldInterrupt = args.shouldInterrupt, this.loadModuleSource = args.loadModuleSource, this.normalizeModule = args.normalizeModule;
	}
};
var QuickJSModuleCallbacks = class {
	constructor(module) {
		this.contextCallbacks = /* @__PURE__ */ new Map();
		this.runtimeCallbacks = /* @__PURE__ */ new Map();
		this.suspendedCount = 0;
		this.cToHostCallbacks = new QuickJSEmscriptenModuleCallbacks({
			freeHostRef: (_asyncify, rt, host_ref_id) => {
				let runtimeCallbacks = this.runtimeCallbacks.get(rt);
				if (!runtimeCallbacks) throw new Error(`QuickJSRuntime(rt = ${rt}) not found when trying to free HostRef(id = ${host_ref_id})`);
				runtimeCallbacks.freeHostRef(rt, host_ref_id);
			},
			callFunction: (asyncify, ctx, this_ptr, argc, argv, fn_id) => this.handleAsyncify(asyncify, () => {
				try {
					let vm = this.contextCallbacks.get(ctx);
					if (!vm) throw new Error(`QuickJSContext(ctx = ${ctx}) not found for C function call "${fn_id}"`);
					return vm.callFunction(ctx, this_ptr, argc, argv, fn_id);
				} catch (error) {
					return console.error("[C to host error: returning null]", error), 0;
				}
			}),
			shouldInterrupt: (asyncify, rt) => this.handleAsyncify(asyncify, () => {
				try {
					let vm = this.runtimeCallbacks.get(rt);
					if (!vm) throw new Error(`QuickJSRuntime(rt = ${rt}) not found for C interrupt`);
					return vm.shouldInterrupt(rt);
				} catch (error) {
					return console.error("[C to host interrupt: returning error]", error), 1;
				}
			}),
			loadModuleSource: (asyncify, rt, ctx, moduleName) => this.handleAsyncify(asyncify, () => {
				try {
					let runtimeCallbacks = this.runtimeCallbacks.get(rt);
					if (!runtimeCallbacks) throw new Error(`QuickJSRuntime(rt = ${rt}) not found for C module loader`);
					let loadModule = runtimeCallbacks.loadModuleSource;
					if (!loadModule) throw new Error(`QuickJSRuntime(rt = ${rt}) does not support module loading`);
					return loadModule(rt, ctx, moduleName);
				} catch (error) {
					return console.error("[C to host module loader error: returning null]", error), 0;
				}
			}),
			normalizeModule: (asyncify, rt, ctx, moduleBaseName, moduleName) => this.handleAsyncify(asyncify, () => {
				try {
					let runtimeCallbacks = this.runtimeCallbacks.get(rt);
					if (!runtimeCallbacks) throw new Error(`QuickJSRuntime(rt = ${rt}) not found for C module loader`);
					let normalizeModule = runtimeCallbacks.normalizeModule;
					if (!normalizeModule) throw new Error(`QuickJSRuntime(rt = ${rt}) does not support module loading`);
					return normalizeModule(rt, ctx, moduleBaseName, moduleName);
				} catch (error) {
					return console.error("[C to host module loader error: returning null]", error), 0;
				}
			})
		});
		this.module = module, this.module.callbacks = this.cToHostCallbacks;
	}
	setRuntimeCallbacks(rt, callbacks) {
		this.runtimeCallbacks.set(rt, callbacks);
	}
	deleteRuntime(rt) {
		this.runtimeCallbacks.delete(rt);
	}
	setContextCallbacks(ctx, callbacks) {
		this.contextCallbacks.set(ctx, callbacks);
	}
	deleteContext(ctx) {
		this.contextCallbacks.delete(ctx);
	}
	handleAsyncify(asyncify, fn) {
		if (asyncify) return asyncify.handleSleep((done) => {
			try {
				let result = fn();
				if (!(result instanceof Promise)) {
					done(result);
					return;
				}
				if (this.suspended) throw new QuickJSAsyncifyError(`Already suspended at: ${this.suspended.stack}
Attempted to suspend at:`);
				this.suspended = new QuickJSAsyncifySuspended(`(${this.suspendedCount++})`), this.suspended, result.then((resolvedResult) => {
					this.suspended = void 0, done(resolvedResult);
				}, (error) => {
					console.error("QuickJS: cannot handle error in suspended function", error), this.suspended = void 0;
				});
			} catch (error) {
				throw this.suspended = void 0, error;
			}
		});
		let value = fn();
		if (value instanceof Promise) throw new Error("Promise return value not supported in non-asyncify context.");
		return value;
	}
};
function applyBaseRuntimeOptions(runtime, options) {
	options.interruptHandler && runtime.setInterruptHandler(options.interruptHandler), options.maxStackSizeBytes !== void 0 && runtime.setMaxStackSize(options.maxStackSizeBytes), options.memoryLimitBytes !== void 0 && runtime.setMemoryLimit(options.memoryLimitBytes);
}
function applyModuleEvalRuntimeOptions(runtime, options) {
	options.moduleLoader && runtime.setModuleLoader(options.moduleLoader), options.shouldInterrupt && runtime.setInterruptHandler(options.shouldInterrupt), options.memoryLimitBytes !== void 0 && runtime.setMemoryLimit(options.memoryLimitBytes), options.maxStackSizeBytes !== void 0 && runtime.setMaxStackSize(options.maxStackSizeBytes);
}
var QuickJSWASMModule = class {
	constructor(module, ffi) {
		this.module = module, this.ffi = ffi, this.callbacks = new QuickJSModuleCallbacks(module);
	}
	newRuntime(options = {}) {
		let rt = new Lifetime(this.ffi.QTS_NewRuntime(), void 0, (rt_ptr) => {
			this.ffi.QTS_FreeRuntime(rt_ptr), this.callbacks.deleteRuntime(rt_ptr);
		}), runtime = new QuickJSRuntime({
			module: this.module,
			callbacks: this.callbacks,
			ffi: this.ffi,
			rt
		});
		return applyBaseRuntimeOptions(runtime, options), options.moduleLoader && runtime.setModuleLoader(options.moduleLoader), runtime;
	}
	newContext(options = {}) {
		let runtime = this.newRuntime(), context = runtime.newContext({
			...options,
			ownedLifetimes: concat(runtime, options.ownedLifetimes)
		});
		return runtime.context = context, context;
	}
	evalCode(code, options = {}) {
		return Scope.withScope((scope) => {
			let vm = scope.manage(this.newContext());
			applyModuleEvalRuntimeOptions(vm.runtime, options);
			let result = vm.evalCode(code, "eval.js");
			if (options.memoryLimitBytes !== void 0 && vm.runtime.setMemoryLimit(-1), result.error) throw vm.dump(scope.manage(result.error));
			return vm.dump(scope.manage(result.value));
		});
	}
	getWasmMemory() {
		let memory = this.module.quickjsEmscriptenInit?.(() => {})?.getWasmMemory?.();
		if (!memory) throw new Error("Variant does not support getting WebAssembly.Memory");
		return memory;
	}
	getFFI() {
		return this.ffi;
	}
};
//#endregion
export { QuickJSModuleCallbacks, QuickJSWASMModule, IntrinsicsFlags as _, QuickJSContext as a, applyBaseRuntimeOptions, applyModuleEvalRuntimeOptions, Scope as c, WeakLifetime as d, createDisposableArray as f, GetOwnPropertyNamesFlags as g, EvalFlags as h, Lifetime as i, StaticLifetime as l, errors_exports as m, DisposableResult as n, QuickJSDeferredPromise as o, debugLog as p, DisposableSuccess as r, QuickJSRuntime as s, DisposableFail as t, UsingDisposable as u, IsEqualOp as v, JSPromiseStateEnum as y };
