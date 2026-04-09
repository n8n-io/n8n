const externalValue = new WeakMap();
function isExternal(object) {
    return externalValue.has(object);
}
const External = (() => {
    function External(value) {
        Object.setPrototypeOf(this, null);
        externalValue.set(this, value);
    }
    External.prototype = null;
    return External;
})();
function getExternalValue(external) {
    if (!isExternal(external)) {
        throw new TypeError('not external');
    }
    return externalValue.get(external);
}

const supportNewFunction = (function () {
    let f;
    try {
        f = new Function();
    }
    catch (_) {
        return false;
    }
    return typeof f === 'function';
})();
const _global = (function () {
    if (typeof globalThis !== 'undefined')
        return globalThis;
    let g = (function () { return this; })();
    if (!g && supportNewFunction) {
        try {
            g = new Function('return this')();
        }
        catch (_) { }
    }
    if (!g) {
        if (typeof __webpack_public_path__ === 'undefined') {
            if (typeof global !== 'undefined')
                return global;
        }
        if (typeof window !== 'undefined')
            return window;
        if (typeof self !== 'undefined')
            return self;
    }
    return g;
})();
class TryCatch {
    constructor() {
        this._exception = undefined;
        this._caught = false;
    }
    isEmpty() {
        return !this._caught;
    }
    hasCaught() {
        return this._caught;
    }
    exception() {
        return this._exception;
    }
    setError(err) {
        this._caught = true;
        this._exception = err;
    }
    reset() {
        this._caught = false;
        this._exception = undefined;
    }
    extractException() {
        const e = this._exception;
        this.reset();
        return e;
    }
}
const canSetFunctionName = (function () {
    var _a;
    try {
        return Boolean((_a = Object.getOwnPropertyDescriptor(Function.prototype, 'name')) === null || _a === void 0 ? void 0 : _a.configurable);
    }
    catch (_) {
        return false;
    }
})();
const supportReflect = typeof Reflect === 'object';
const supportFinalizer = (typeof FinalizationRegistry !== 'undefined') && (typeof WeakRef !== 'undefined');
const supportWeakSymbol = (function () {
    try {
        const sym = Symbol();
        new WeakRef(sym);
        new WeakMap().set(sym, undefined);
    }
    catch (_) {
        return false;
    }
    return true;
})();
const supportBigInt = typeof BigInt !== 'undefined';
function isReferenceType(v) {
    return (typeof v === 'object' && v !== null) || typeof v === 'function';
}
const _require = (function () {
    let nativeRequire;
    if (typeof __webpack_public_path__ !== 'undefined') {
        nativeRequire = (function () {
            return typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined;
        })();
    }
    else {
        nativeRequire = (function () {
            return typeof __webpack_public_path__ !== 'undefined' ? (typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined) : (typeof require !== 'undefined' ? require : undefined);
        })();
    }
    return nativeRequire;
})();
const _MessageChannel = typeof MessageChannel === 'function'
    ? MessageChannel
    : (function () {
        try {
            return _require('worker_threads').MessageChannel;
        }
        catch (_) { }
        return undefined;
    })();
const _setImmediate = typeof setImmediate === 'function'
    ? setImmediate
    : function (callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('The "callback" argument must be of type function');
        }
        if (_MessageChannel) {
            let channel = new _MessageChannel();
            channel.port1.onmessage = function () {
                channel.port1.onmessage = null;
                channel = undefined;
                callback();
            };
            channel.port2.postMessage(null);
        }
        else {
            setTimeout(callback, 0);
        }
    };
const _Buffer = typeof Buffer === 'function'
    ? Buffer
    : (function () {
        try {
            return _require('buffer').Buffer;
        }
        catch (_) { }
        return undefined;
    })();
const version = "1.9.1";
const NODE_API_SUPPORTED_VERSION_MIN = 1;
const NODE_API_SUPPORTED_VERSION_MAX = 10;
const NAPI_VERSION_EXPERIMENTAL = 2147483647;
const NODE_API_DEFAULT_MODULE_API_VERSION = 8;

class Handle {
    constructor(id, value) {
        this.id = id;
        this.value = value;
    }
    data() {
        return getExternalValue(this.value);
    }
    isNumber() {
        return typeof this.value === 'number';
    }
    isBigInt() {
        return typeof this.value === 'bigint';
    }
    isString() {
        return typeof this.value === 'string';
    }
    isFunction() {
        return typeof this.value === 'function';
    }
    isExternal() {
        return isExternal(this.value);
    }
    isObject() {
        return typeof this.value === 'object' && this.value !== null;
    }
    isArray() {
        return Array.isArray(this.value);
    }
    isArrayBuffer() {
        return (this.value instanceof ArrayBuffer);
    }
    isTypedArray() {
        return (ArrayBuffer.isView(this.value)) && !(this.value instanceof DataView);
    }
    isBuffer(BufferConstructor) {
        if (ArrayBuffer.isView(this.value))
            return true;
        BufferConstructor !== null && BufferConstructor !== void 0 ? BufferConstructor : (BufferConstructor = _Buffer);
        return typeof BufferConstructor === 'function' && BufferConstructor.isBuffer(this.value);
    }
    isDataView() {
        return (this.value instanceof DataView);
    }
    isDate() {
        return (this.value instanceof Date);
    }
    isPromise() {
        return (this.value instanceof Promise);
    }
    isBoolean() {
        return typeof this.value === 'boolean';
    }
    isUndefined() {
        return this.value === undefined;
    }
    isSymbol() {
        return typeof this.value === 'symbol';
    }
    isNull() {
        return this.value === null;
    }
    dispose() {
        this.value = undefined;
    }
}
class ConstHandle extends Handle {
    constructor(id, value) {
        super(id, value);
    }
    dispose() { }
}
class HandleStore {
    constructor() {
        this._values = [
            undefined,
            HandleStore.UNDEFINED,
            HandleStore.NULL,
            HandleStore.FALSE,
            HandleStore.TRUE,
            HandleStore.GLOBAL
        ];
        this._next = HandleStore.MIN_ID;
    }
    push(value) {
        let h;
        const next = this._next;
        const values = this._values;
        if (next < values.length) {
            h = values[next];
            h.value = value;
        }
        else {
            h = new Handle(next, value);
            values[next] = h;
        }
        this._next++;
        return h;
    }
    erase(start, end) {
        this._next = start;
        const values = this._values;
        for (let i = start; i < end; ++i) {
            values[i].dispose();
        }
    }
    get(id) {
        return this._values[id];
    }
    swap(a, b) {
        const values = this._values;
        const h = values[a];
        values[a] = values[b];
        values[a].id = Number(a);
        values[b] = h;
        h.id = Number(b);
    }
    dispose() {
        this._values.length = HandleStore.MIN_ID;
        this._next = HandleStore.MIN_ID;
    }
}
HandleStore.UNDEFINED = new ConstHandle(1, undefined);
HandleStore.NULL = new ConstHandle(2, null);
HandleStore.FALSE = new ConstHandle(3, false);
HandleStore.TRUE = new ConstHandle(4, true);
HandleStore.GLOBAL = new ConstHandle(5, _global);
HandleStore.MIN_ID = 6;

class HandleScope {
    constructor(handleStore, id, parentScope, start, end = start) {
        this.handleStore = handleStore;
        this.id = id;
        this.parent = parentScope;
        this.child = null;
        if (parentScope !== null)
            parentScope.child = this;
        this.start = start;
        this.end = end;
        this._escapeCalled = false;
        this.callbackInfo = {
            thiz: undefined,
            data: 0,
            args: undefined,
            fn: undefined
        };
    }
    add(value) {
        const h = this.handleStore.push(value);
        this.end++;
        return h;
    }
    addExternal(data) {
        return this.add(new External(data));
    }
    dispose() {
        if (this._escapeCalled)
            this._escapeCalled = false;
        if (this.start === this.end)
            return;
        this.handleStore.erase(this.start, this.end);
    }
    escape(handle) {
        if (this._escapeCalled)
            return null;
        this._escapeCalled = true;
        if (handle < this.start || handle >= this.end) {
            return null;
        }
        this.handleStore.swap(handle, this.start);
        const h = this.handleStore.get(this.start);
        this.start++;
        this.parent.end++;
        return h;
    }
    escapeCalled() {
        return this._escapeCalled;
    }
}

class ScopeStore {
    constructor() {
        this._rootScope = new HandleScope(null, 0, null, 1, HandleStore.MIN_ID);
        this.currentScope = this._rootScope;
        this._values = [undefined];
    }
    get(id) {
        return this._values[id];
    }
    openScope(handleStore) {
        const currentScope = this.currentScope;
        let scope = currentScope.child;
        if (scope !== null) {
            scope.start = scope.end = currentScope.end;
        }
        else {
            const id = currentScope.id + 1;
            scope = new HandleScope(handleStore, id, currentScope, currentScope.end);
            this._values[id] = scope;
        }
        this.currentScope = scope;
        return scope;
    }
    closeScope() {
        const scope = this.currentScope;
        this.currentScope = scope.parent;
        scope.dispose();
    }
    dispose() {
        this.currentScope = this._rootScope;
        this._values.length = 1;
    }
}

class RefTracker {
    constructor() {
        this._next = null;
        this._prev = null;
    }
    dispose() { }
    finalize() { }
    link(list) {
        this._prev = list;
        this._next = list._next;
        if (this._next !== null) {
            this._next._prev = this;
        }
        list._next = this;
    }
    unlink() {
        if (this._prev !== null) {
            this._prev._next = this._next;
        }
        if (this._next !== null) {
            this._next._prev = this._prev;
        }
        this._prev = null;
        this._next = null;
    }
    static finalizeAll(list) {
        while (list._next !== null) {
            list._next.finalize();
        }
    }
}

class Finalizer {
    constructor(envObject, _finalizeCallback = 0, _finalizeData = 0, _finalizeHint = 0) {
        this.envObject = envObject;
        this._finalizeCallback = _finalizeCallback;
        this._finalizeData = _finalizeData;
        this._finalizeHint = _finalizeHint;
        this._makeDynCall_vppp = envObject.makeDynCall_vppp;
    }
    callback() { return this._finalizeCallback; }
    data() { return this._finalizeData; }
    hint() { return this._finalizeHint; }
    resetEnv() {
        this.envObject = undefined;
    }
    resetFinalizer() {
        this._finalizeCallback = 0;
        this._finalizeData = 0;
        this._finalizeHint = 0;
    }
    callFinalizer() {
        const finalize_callback = this._finalizeCallback;
        const finalize_data = this._finalizeData;
        const finalize_hint = this._finalizeHint;
        this.resetFinalizer();
        if (!finalize_callback)
            return;
        const fini = Number(finalize_callback);
        if (!this.envObject) {
            this._makeDynCall_vppp(fini)(0, finalize_data, finalize_hint);
        }
        else {
            this.envObject.callFinalizer(fini, finalize_data, finalize_hint);
        }
    }
    dispose() {
        this.envObject = undefined;
        this._makeDynCall_vppp = undefined;
    }
}

class TrackedFinalizer extends RefTracker {
    static create(envObject, finalize_callback, finalize_data, finalize_hint) {
        const finalizer = new TrackedFinalizer(envObject, finalize_callback, finalize_data, finalize_hint);
        finalizer.link(envObject.finalizing_reflist);
        return finalizer;
    }
    constructor(envObject, finalize_callback, finalize_data, finalize_hint) {
        super();
        this._finalizer = new Finalizer(envObject, finalize_callback, finalize_data, finalize_hint);
    }
    data() {
        return this._finalizer.data();
    }
    dispose() {
        if (!this._finalizer)
            return;
        this.unlink();
        this._finalizer.envObject.dequeueFinalizer(this);
        this._finalizer.dispose();
        this._finalizer = undefined;
        super.dispose();
    }
    finalize() {
        this.unlink();
        let error;
        let caught = false;
        try {
            this._finalizer.callFinalizer();
        }
        catch (err) {
            caught = true;
            error = err;
        }
        this.dispose();
        if (caught) {
            throw error;
        }
    }
}

function throwNodeApiVersionError(moduleName, moduleApiVersion) {
    const errorMessage = `${moduleName} requires Node-API version ${moduleApiVersion}, but this version of Node.js only supports version ${NODE_API_SUPPORTED_VERSION_MAX} add-ons.`;
    throw new Error(errorMessage);
}
function handleThrow(envObject, value) {
    if (envObject.terminatedOrTerminating()) {
        return;
    }
    throw value;
}
class Env {
    constructor(ctx, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort) {
        this.ctx = ctx;
        this.moduleApiVersion = moduleApiVersion;
        this.makeDynCall_vppp = makeDynCall_vppp;
        this.makeDynCall_vp = makeDynCall_vp;
        this.abort = abort;
        this.openHandleScopes = 0;
        this.instanceData = null;
        this.tryCatch = new TryCatch();
        this.refs = 1;
        this.reflist = new RefTracker();
        this.finalizing_reflist = new RefTracker();
        this.pendingFinalizers = [];
        this.lastError = {
            errorCode: 0,
            engineErrorCode: 0,
            engineReserved: 0
        };
        this.inGcFinalizer = false;
        this._bindingMap = new WeakMap();
        this.id = 0;
    }
    canCallIntoJs() {
        return true;
    }
    terminatedOrTerminating() {
        return !this.canCallIntoJs();
    }
    ref() {
        this.refs++;
    }
    unref() {
        this.refs--;
        if (this.refs === 0) {
            this.dispose();
        }
    }
    ensureHandle(value) {
        return this.ctx.ensureHandle(value);
    }
    ensureHandleId(value) {
        return this.ensureHandle(value).id;
    }
    clearLastError() {
        const lastError = this.lastError;
        if (lastError.errorCode !== 0)
            lastError.errorCode = 0;
        if (lastError.engineErrorCode !== 0)
            lastError.engineErrorCode = 0;
        if (lastError.engineReserved !== 0)
            lastError.engineReserved = 0;
        return 0;
    }
    setLastError(error_code, engine_error_code = 0, engine_reserved = 0) {
        const lastError = this.lastError;
        if (lastError.errorCode !== error_code)
            lastError.errorCode = error_code;
        if (lastError.engineErrorCode !== engine_error_code)
            lastError.engineErrorCode = engine_error_code;
        if (lastError.engineReserved !== engine_reserved)
            lastError.engineReserved = engine_reserved;
        return error_code;
    }
    getReturnStatus() {
        return !this.tryCatch.hasCaught() ? 0 : this.setLastError(10);
    }
    callIntoModule(fn, handleException = handleThrow) {
        const openHandleScopesBefore = this.openHandleScopes;
        this.clearLastError();
        const r = fn(this);
        if (openHandleScopesBefore !== this.openHandleScopes) {
            this.abort('open_handle_scopes != open_handle_scopes_before');
        }
        if (this.tryCatch.hasCaught()) {
            const err = this.tryCatch.extractException();
            handleException(this, err);
        }
        return r;
    }
    invokeFinalizerFromGC(finalizer) {
        if (this.moduleApiVersion !== NAPI_VERSION_EXPERIMENTAL) {
            this.enqueueFinalizer(finalizer);
        }
        else {
            const saved = this.inGcFinalizer;
            this.inGcFinalizer = true;
            try {
                finalizer.finalize();
            }
            finally {
                this.inGcFinalizer = saved;
            }
        }
    }
    checkGCAccess() {
        if (this.moduleApiVersion === NAPI_VERSION_EXPERIMENTAL && this.inGcFinalizer) {
            this.abort('Finalizer is calling a function that may affect GC state.\n' +
                'The finalizers are run directly from GC and must not affect GC ' +
                'state.\n' +
                'Use `node_api_post_finalizer` from inside of the finalizer to work ' +
                'around this issue.\n' +
                'It schedules the call as a new task in the event loop.');
        }
    }
    enqueueFinalizer(finalizer) {
        if (this.pendingFinalizers.indexOf(finalizer) === -1) {
            this.pendingFinalizers.push(finalizer);
        }
    }
    dequeueFinalizer(finalizer) {
        const index = this.pendingFinalizers.indexOf(finalizer);
        if (index !== -1) {
            this.pendingFinalizers.splice(index, 1);
        }
    }
    deleteMe() {
        RefTracker.finalizeAll(this.finalizing_reflist);
        RefTracker.finalizeAll(this.reflist);
        this.tryCatch.extractException();
        this.ctx.envStore.remove(this.id);
    }
    dispose() {
        if (this.id === 0)
            return;
        this.deleteMe();
        this.finalizing_reflist.dispose();
        this.reflist.dispose();
        this.id = 0;
    }
    initObjectBinding(value) {
        const binding = {
            wrapped: 0,
            tag: null
        };
        this._bindingMap.set(value, binding);
        return binding;
    }
    getObjectBinding(value) {
        if (this._bindingMap.has(value)) {
            return this._bindingMap.get(value);
        }
        return this.initObjectBinding(value);
    }
    setInstanceData(data, finalize_cb, finalize_hint) {
        if (this.instanceData) {
            this.instanceData.dispose();
        }
        this.instanceData = TrackedFinalizer.create(this, finalize_cb, data, finalize_hint);
    }
    getInstanceData() {
        return this.instanceData ? this.instanceData.data() : 0;
    }
}
class NodeEnv extends Env {
    constructor(ctx, filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort, nodeBinding) {
        super(ctx, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort);
        this.filename = filename;
        this.nodeBinding = nodeBinding;
        this.destructing = false;
        this.finalizationScheduled = false;
    }
    deleteMe() {
        this.destructing = true;
        this.drainFinalizerQueue();
        super.deleteMe();
    }
    canCallIntoJs() {
        return super.canCallIntoJs() && this.ctx.canCallIntoJs();
    }
    triggerFatalException(err) {
        if (this.nodeBinding) {
            this.nodeBinding.napi.fatalException(err);
        }
        else {
            if (typeof process === 'object' && process !== null && typeof process._fatalException === 'function') {
                const handled = process._fatalException(err);
                if (!handled) {
                    console.error(err);
                    process.exit(1);
                }
            }
            else {
                throw err;
            }
        }
    }
    callbackIntoModule(enforceUncaughtExceptionPolicy, fn) {
        return this.callIntoModule(fn, (envObject, err) => {
            if (envObject.terminatedOrTerminating()) {
                return;
            }
            const hasProcess = typeof process === 'object' && process !== null;
            const hasForceFlag = hasProcess ? Boolean(process.execArgv && (process.execArgv.indexOf('--force-node-api-uncaught-exceptions-policy') !== -1)) : false;
            if (envObject.moduleApiVersion < 10 && !hasForceFlag && !enforceUncaughtExceptionPolicy) {
                const warn = hasProcess && typeof process.emitWarning === 'function'
                    ? process.emitWarning
                    : function (warning, type, code) {
                        if (warning instanceof Error) {
                            console.warn(warning.toString());
                        }
                        else {
                            const prefix = code ? `[${code}] ` : '';
                            console.warn(`${prefix}${type || 'Warning'}: ${warning}`);
                        }
                    };
                warn('Uncaught Node-API callback exception detected, please run node with option --force-node-api-uncaught-exceptions-policy=true to handle those exceptions properly.', 'DeprecationWarning', 'DEP0168');
                return;
            }
            envObject.triggerFatalException(err);
        });
    }
    callFinalizer(cb, data, hint) {
        this.callFinalizerInternal(1, cb, data, hint);
    }
    callFinalizerInternal(forceUncaught, cb, data, hint) {
        const f = this.makeDynCall_vppp(cb);
        const env = this.id;
        const scope = this.ctx.openScope(this);
        try {
            this.callbackIntoModule(Boolean(forceUncaught), () => { f(env, data, hint); });
        }
        finally {
            this.ctx.closeScope(this, scope);
        }
    }
    enqueueFinalizer(finalizer) {
        super.enqueueFinalizer(finalizer);
        if (!this.finalizationScheduled && !this.destructing) {
            this.finalizationScheduled = true;
            this.ref();
            _setImmediate(() => {
                this.finalizationScheduled = false;
                this.unref();
                this.drainFinalizerQueue();
            });
        }
    }
    drainFinalizerQueue() {
        while (this.pendingFinalizers.length > 0) {
            const refTracker = this.pendingFinalizers.shift();
            refTracker.finalize();
        }
    }
}
function newEnv(ctx, filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort, nodeBinding) {
    moduleApiVersion = typeof moduleApiVersion !== 'number' ? NODE_API_DEFAULT_MODULE_API_VERSION : moduleApiVersion;
    if (moduleApiVersion < NODE_API_DEFAULT_MODULE_API_VERSION) {
        moduleApiVersion = NODE_API_DEFAULT_MODULE_API_VERSION;
    }
    else if (moduleApiVersion > NODE_API_SUPPORTED_VERSION_MAX && moduleApiVersion !== NAPI_VERSION_EXPERIMENTAL) {
        throwNodeApiVersionError(filename, moduleApiVersion);
    }
    const env = new NodeEnv(ctx, filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort, nodeBinding);
    ctx.envStore.add(env);
    ctx.addCleanupHook(env, () => { env.unref(); }, 0);
    return env;
}

class EmnapiError extends Error {
    constructor(message) {
        super(message);
        const ErrorConstructor = new.target;
        const proto = ErrorConstructor.prototype;
        if (!(this instanceof EmnapiError)) {
            const setPrototypeOf = Object.setPrototypeOf;
            if (typeof setPrototypeOf === 'function') {
                setPrototypeOf.call(Object, this, proto);
            }
            else {
                this.__proto__ = proto;
            }
            if (typeof Error.captureStackTrace === 'function') {
                Error.captureStackTrace(this, ErrorConstructor);
            }
        }
    }
}
Object.defineProperty(EmnapiError.prototype, 'name', {
    configurable: true,
    writable: true,
    value: 'EmnapiError'
});
class NotSupportWeakRefError extends EmnapiError {
    constructor(api, message) {
        super(`${api}: The current runtime does not support "FinalizationRegistry" and "WeakRef".${message ? ` ${message}` : ''}`);
    }
}
Object.defineProperty(NotSupportWeakRefError.prototype, 'name', {
    configurable: true,
    writable: true,
    value: 'NotSupportWeakRefError'
});
class NotSupportBufferError extends EmnapiError {
    constructor(api, message) {
        super(`${api}: The current runtime does not support "Buffer". Consider using buffer polyfill to make sure \`globalThis.Buffer\` is defined.${message ? ` ${message}` : ''}`);
    }
}
Object.defineProperty(NotSupportBufferError.prototype, 'name', {
    configurable: true,
    writable: true,
    value: 'NotSupportBufferError'
});

class StrongRef {
    constructor(value) {
        this._value = value;
    }
    deref() {
        return this._value;
    }
    dispose() {
        this._value = undefined;
    }
}
class Persistent {
    constructor(value) {
        this._ref = new StrongRef(value);
    }
    setWeak(param, callback) {
        if (!supportFinalizer || this._ref === undefined || this._ref instanceof WeakRef)
            return;
        const value = this._ref.deref();
        try {
            Persistent._registry.register(value, this, this);
            const weakRef = new WeakRef(value);
            this._ref.dispose();
            this._ref = weakRef;
            this._param = param;
            this._callback = callback;
        }
        catch (err) {
            if (typeof value === 'symbol') ;
            else {
                throw err;
            }
        }
    }
    clearWeak() {
        if (!supportFinalizer || this._ref === undefined)
            return;
        if (this._ref instanceof WeakRef) {
            try {
                Persistent._registry.unregister(this);
            }
            catch (_) { }
            this._param = undefined;
            this._callback = undefined;
            const value = this._ref.deref();
            if (value === undefined) {
                this._ref = value;
            }
            else {
                this._ref = new StrongRef(value);
            }
        }
    }
    reset() {
        if (supportFinalizer) {
            try {
                Persistent._registry.unregister(this);
            }
            catch (_) { }
        }
        this._param = undefined;
        this._callback = undefined;
        if (this._ref instanceof StrongRef) {
            this._ref.dispose();
        }
        this._ref = undefined;
    }
    isEmpty() {
        return this._ref === undefined;
    }
    deref() {
        if (this._ref === undefined)
            return undefined;
        return this._ref.deref();
    }
}
Persistent._registry = supportFinalizer
    ? new FinalizationRegistry((value) => {
        value._ref = undefined;
        const callback = value._callback;
        const param = value._param;
        value._callback = undefined;
        value._param = undefined;
        if (typeof callback === 'function') {
            callback(param);
        }
    })
    : undefined;

var ReferenceOwnership;
(function (ReferenceOwnership) {
    ReferenceOwnership[ReferenceOwnership["kRuntime"] = 0] = "kRuntime";
    ReferenceOwnership[ReferenceOwnership["kUserland"] = 1] = "kUserland";
})(ReferenceOwnership || (ReferenceOwnership = {}));
function canBeHeldWeakly(value) {
    return value.isObject() || value.isFunction() || value.isSymbol();
}
class Reference extends RefTracker {
    static weakCallback(ref) {
        ref.persistent.reset();
        ref.invokeFinalizerFromGC();
    }
    static create(envObject, handle_id, initialRefcount, ownership, _unused1, _unused2, _unused3) {
        const ref = new Reference(envObject, handle_id, initialRefcount, ownership);
        envObject.ctx.refStore.add(ref);
        ref.link(envObject.reflist);
        return ref;
    }
    constructor(envObject, handle_id, initialRefcount, ownership) {
        super();
        this.envObject = envObject;
        this._refcount = initialRefcount;
        this._ownership = ownership;
        const handle = envObject.ctx.handleStore.get(handle_id);
        this.canBeWeak = canBeHeldWeakly(handle);
        this.persistent = new Persistent(handle.value);
        this.id = 0;
        if (initialRefcount === 0) {
            this._setWeak();
        }
    }
    ref() {
        if (this.persistent.isEmpty()) {
            return 0;
        }
        if (++this._refcount === 1 && this.canBeWeak) {
            this.persistent.clearWeak();
        }
        return this._refcount;
    }
    unref() {
        if (this.persistent.isEmpty() || this._refcount === 0) {
            return 0;
        }
        if (--this._refcount === 0) {
            this._setWeak();
        }
        return this._refcount;
    }
    get(envObject = this.envObject) {
        if (this.persistent.isEmpty()) {
            return 0;
        }
        const obj = this.persistent.deref();
        const handle = envObject.ensureHandle(obj);
        return handle.id;
    }
    resetFinalizer() { }
    data() { return 0; }
    refcount() { return this._refcount; }
    ownership() { return this._ownership; }
    callUserFinalizer() { }
    invokeFinalizerFromGC() {
        this.finalize();
    }
    _setWeak() {
        if (this.canBeWeak) {
            this.persistent.setWeak(this, Reference.weakCallback);
        }
        else {
            this.persistent.reset();
        }
    }
    finalize() {
        this.persistent.reset();
        const deleteMe = this._ownership === ReferenceOwnership.kRuntime;
        this.unlink();
        this.callUserFinalizer();
        if (deleteMe) {
            this.dispose();
        }
    }
    dispose() {
        if (this.id === 0)
            return;
        this.unlink();
        this.persistent.reset();
        this.envObject.ctx.refStore.remove(this.id);
        super.dispose();
        this.envObject = undefined;
        this.id = 0;
    }
}
class ReferenceWithData extends Reference {
    static create(envObject, value, initialRefcount, ownership, data) {
        const reference = new ReferenceWithData(envObject, value, initialRefcount, ownership, data);
        envObject.ctx.refStore.add(reference);
        reference.link(envObject.reflist);
        return reference;
    }
    constructor(envObject, value, initialRefcount, ownership, _data) {
        super(envObject, value, initialRefcount, ownership);
        this._data = _data;
    }
    data() {
        return this._data;
    }
}
class ReferenceWithFinalizer extends Reference {
    static create(envObject, value, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint) {
        const reference = new ReferenceWithFinalizer(envObject, value, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint);
        envObject.ctx.refStore.add(reference);
        reference.link(envObject.finalizing_reflist);
        return reference;
    }
    constructor(envObject, value, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint) {
        super(envObject, value, initialRefcount, ownership);
        this._finalizer = new Finalizer(envObject, finalize_callback, finalize_data, finalize_hint);
    }
    resetFinalizer() {
        this._finalizer.resetFinalizer();
    }
    data() {
        return this._finalizer.data();
    }
    callUserFinalizer() {
        this._finalizer.callFinalizer();
    }
    invokeFinalizerFromGC() {
        this._finalizer.envObject.invokeFinalizerFromGC(this);
    }
    dispose() {
        if (!this._finalizer)
            return;
        this._finalizer.envObject.dequeueFinalizer(this);
        this._finalizer.dispose();
        super.dispose();
        this._finalizer = undefined;
    }
}

class Deferred {
    static create(ctx, value) {
        const deferred = new Deferred(ctx, value);
        ctx.deferredStore.add(deferred);
        return deferred;
    }
    constructor(ctx, value) {
        this.id = 0;
        this.ctx = ctx;
        this.value = value;
    }
    resolve(value) {
        this.value.resolve(value);
        this.dispose();
    }
    reject(reason) {
        this.value.reject(reason);
        this.dispose();
    }
    dispose() {
        this.ctx.deferredStore.remove(this.id);
        this.id = 0;
        this.value = null;
        this.ctx = null;
    }
}

class Store {
    constructor() {
        this._values = [undefined];
        this._values.length = 4;
        this._size = 1;
        this._freeList = [];
    }
    add(value) {
        let id;
        if (this._freeList.length) {
            id = this._freeList.shift();
        }
        else {
            id = this._size;
            this._size++;
            const capacity = this._values.length;
            if (id >= capacity) {
                this._values.length = capacity + (capacity >> 1) + 16;
            }
        }
        value.id = id;
        this._values[id] = value;
    }
    get(id) {
        return this._values[id];
    }
    has(id) {
        return this._values[id] !== undefined;
    }
    remove(id) {
        const value = this._values[id];
        if (value) {
            value.id = 0;
            this._values[id] = undefined;
            this._freeList.push(Number(id));
        }
    }
    dispose() {
        for (let i = 1; i < this._size; ++i) {
            const value = this._values[i];
            value === null || value === void 0 ? void 0 : value.dispose();
        }
        this._values = [undefined];
        this._size = 1;
        this._freeList = [];
    }
}

class CleanupHookCallback {
    constructor(envObject, fn, arg, order) {
        this.envObject = envObject;
        this.fn = fn;
        this.arg = arg;
        this.order = order;
    }
}
class CleanupQueue {
    constructor() {
        this._cleanupHooks = [];
        this._cleanupHookCounter = 0;
    }
    empty() {
        return this._cleanupHooks.length === 0;
    }
    add(envObject, fn, arg) {
        if (this._cleanupHooks.filter((hook) => (hook.envObject === envObject && hook.fn === fn && hook.arg === arg)).length > 0) {
            throw new Error('Can not add same fn and arg twice');
        }
        this._cleanupHooks.push(new CleanupHookCallback(envObject, fn, arg, this._cleanupHookCounter++));
    }
    remove(envObject, fn, arg) {
        for (let i = 0; i < this._cleanupHooks.length; ++i) {
            const hook = this._cleanupHooks[i];
            if (hook.envObject === envObject && hook.fn === fn && hook.arg === arg) {
                this._cleanupHooks.splice(i, 1);
                return;
            }
        }
    }
    drain() {
        const hooks = this._cleanupHooks.slice();
        hooks.sort((a, b) => (b.order - a.order));
        for (let i = 0; i < hooks.length; ++i) {
            const cb = hooks[i];
            if (typeof cb.fn === 'number') {
                cb.envObject.makeDynCall_vp(cb.fn)(cb.arg);
            }
            else {
                cb.fn(cb.arg);
            }
            this._cleanupHooks.splice(this._cleanupHooks.indexOf(cb), 1);
        }
    }
    dispose() {
        this._cleanupHooks.length = 0;
        this._cleanupHookCounter = 0;
    }
}
class NodejsWaitingRequestCounter {
    constructor() {
        this.refHandle = new _MessageChannel().port1;
        this.count = 0;
    }
    increase() {
        if (this.count === 0) {
            if (this.refHandle.ref) {
                this.refHandle.ref();
            }
        }
        this.count++;
    }
    decrease() {
        if (this.count === 0)
            return;
        if (this.count === 1) {
            if (this.refHandle.unref) {
                this.refHandle.unref();
            }
        }
        this.count--;
    }
}
class Context {
    constructor() {
        this._isStopping = false;
        this._canCallIntoJs = true;
        this._suppressDestroy = false;
        this.envStore = new Store();
        this.scopeStore = new ScopeStore();
        this.refStore = new Store();
        this.deferredStore = new Store();
        this.handleStore = new HandleStore();
        this.feature = {
            supportReflect,
            supportFinalizer,
            supportWeakSymbol,
            supportBigInt,
            supportNewFunction,
            canSetFunctionName,
            setImmediate: _setImmediate,
            Buffer: _Buffer,
            MessageChannel: _MessageChannel
        };
        this.cleanupQueue = new CleanupQueue();
        if (typeof process === 'object' && process !== null && typeof process.once === 'function') {
            this.refCounter = new NodejsWaitingRequestCounter();
            process.once('beforeExit', () => {
                if (!this._suppressDestroy) {
                    this.destroy();
                }
            });
        }
    }
    suppressDestroy() {
        this._suppressDestroy = true;
    }
    getRuntimeVersions() {
        return {
            version,
            NODE_API_SUPPORTED_VERSION_MAX,
            NAPI_VERSION_EXPERIMENTAL,
            NODE_API_DEFAULT_MODULE_API_VERSION
        };
    }
    createNotSupportWeakRefError(api, message) {
        return new NotSupportWeakRefError(api, message);
    }
    createNotSupportBufferError(api, message) {
        return new NotSupportBufferError(api, message);
    }
    createReference(envObject, handle_id, initialRefcount, ownership) {
        return Reference.create(envObject, handle_id, initialRefcount, ownership);
    }
    createReferenceWithData(envObject, handle_id, initialRefcount, ownership, data) {
        return ReferenceWithData.create(envObject, handle_id, initialRefcount, ownership, data);
    }
    createReferenceWithFinalizer(envObject, handle_id, initialRefcount, ownership, finalize_callback = 0, finalize_data = 0, finalize_hint = 0) {
        return ReferenceWithFinalizer.create(envObject, handle_id, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint);
    }
    createDeferred(value) {
        return Deferred.create(this, value);
    }
    createEnv(filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort, nodeBinding) {
        return newEnv(this, filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort, nodeBinding);
    }
    createTrackedFinalizer(envObject, finalize_callback, finalize_data, finalize_hint) {
        return TrackedFinalizer.create(envObject, finalize_callback, finalize_data, finalize_hint);
    }
    getCurrentScope() {
        return this.scopeStore.currentScope;
    }
    addToCurrentScope(value) {
        return this.scopeStore.currentScope.add(value);
    }
    openScope(envObject) {
        const scope = this.scopeStore.openScope(this.handleStore);
        if (envObject)
            envObject.openHandleScopes++;
        return scope;
    }
    closeScope(envObject, _scope) {
        if (envObject && envObject.openHandleScopes === 0)
            return;
        this.scopeStore.closeScope();
        if (envObject)
            envObject.openHandleScopes--;
    }
    ensureHandle(value) {
        switch (value) {
            case undefined: return HandleStore.UNDEFINED;
            case null: return HandleStore.NULL;
            case true: return HandleStore.TRUE;
            case false: return HandleStore.FALSE;
            case _global: return HandleStore.GLOBAL;
        }
        return this.addToCurrentScope(value);
    }
    addCleanupHook(envObject, fn, arg) {
        this.cleanupQueue.add(envObject, fn, arg);
    }
    removeCleanupHook(envObject, fn, arg) {
        this.cleanupQueue.remove(envObject, fn, arg);
    }
    runCleanup() {
        while (!this.cleanupQueue.empty()) {
            this.cleanupQueue.drain();
        }
    }
    increaseWaitingRequestCounter() {
        var _a;
        (_a = this.refCounter) === null || _a === void 0 ? void 0 : _a.increase();
    }
    decreaseWaitingRequestCounter() {
        var _a;
        (_a = this.refCounter) === null || _a === void 0 ? void 0 : _a.decrease();
    }
    setCanCallIntoJs(value) {
        this._canCallIntoJs = value;
    }
    setStopping(value) {
        this._isStopping = value;
    }
    canCallIntoJs() {
        return this._canCallIntoJs && !this._isStopping;
    }
    destroy() {
        this.setStopping(true);
        this.setCanCallIntoJs(false);
        this.runCleanup();
    }
}
let defaultContext;
function createContext() {
    return new Context();
}
function getDefaultContext() {
    if (!defaultContext) {
        defaultContext = createContext();
    }
    return defaultContext;
}

export { ConstHandle, Context, Deferred, EmnapiError, Env, External, Finalizer, Handle, HandleScope, HandleStore, NAPI_VERSION_EXPERIMENTAL, NODE_API_DEFAULT_MODULE_API_VERSION, NODE_API_SUPPORTED_VERSION_MAX, NODE_API_SUPPORTED_VERSION_MIN, NodeEnv, NotSupportBufferError, NotSupportWeakRefError, Persistent, RefTracker, Reference, ReferenceOwnership, ReferenceWithData, ReferenceWithFinalizer, ScopeStore, Store, TrackedFinalizer, TryCatch, createContext, getDefaultContext, getExternalValue, isExternal, isReferenceType, version };
