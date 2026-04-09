var emnapi = (function (exports) {

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    var externalValue = new WeakMap();
    /** @public */
    function isExternal(object) {
        return externalValue.has(object);
    }
    /** @public */ // eslint-disable-next-line @typescript-eslint/no-redeclare
    var External = (function () {
        function External(value) {
            Object.setPrototypeOf(this, null);
            externalValue.set(this, value);
        }
        External.prototype = null;
        return External;
    })();
    /** @public */
    function getExternalValue(external) {
        if (!isExternal(external)) {
            throw new TypeError('not external');
        }
        return externalValue.get(external);
    }

    var supportNewFunction = /*#__PURE__*/ (function () {
        var f;
        try {
            f = new Function();
        }
        catch (_) {
            return false;
        }
        return typeof f === 'function';
    })();
    var _global = /*#__PURE__*/ (function () {
        if (typeof globalThis !== 'undefined')
            return globalThis;
        var g = (function () { return this; })();
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
    var TryCatch = /*#__PURE__*/ (function () {
        function TryCatch() {
            this._exception = undefined;
            this._caught = false;
        }
        TryCatch.prototype.isEmpty = function () {
            return !this._caught;
        };
        TryCatch.prototype.hasCaught = function () {
            return this._caught;
        };
        TryCatch.prototype.exception = function () {
            return this._exception;
        };
        TryCatch.prototype.setError = function (err) {
            this._caught = true;
            this._exception = err;
        };
        TryCatch.prototype.reset = function () {
            this._caught = false;
            this._exception = undefined;
        };
        TryCatch.prototype.extractException = function () {
            var e = this._exception;
            this.reset();
            return e;
        };
        return TryCatch;
    }());
    var canSetFunctionName = /*#__PURE__*/ (function () {
        var _a;
        try {
            return Boolean((_a = Object.getOwnPropertyDescriptor(Function.prototype, 'name')) === null || _a === void 0 ? void 0 : _a.configurable);
        }
        catch (_) {
            return false;
        }
    })();
    var supportReflect = typeof Reflect === 'object';
    var supportFinalizer = (typeof FinalizationRegistry !== 'undefined') && (typeof WeakRef !== 'undefined');
    var supportWeakSymbol = /*#__PURE__*/ (function () {
        try {
            // eslint-disable-next-line symbol-description
            var sym = Symbol();
            // eslint-disable-next-line no-new
            new WeakRef(sym);
            new WeakMap().set(sym, undefined);
        }
        catch (_) {
            return false;
        }
        return true;
    })();
    var supportBigInt = typeof BigInt !== 'undefined';
    function isReferenceType(v) {
        return (typeof v === 'object' && v !== null) || typeof v === 'function';
    }
    var _require = /*#__PURE__*/ (function () {
        var nativeRequire;
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
    var _MessageChannel = typeof MessageChannel === 'function'
        ? MessageChannel
        : /*#__PURE__*/ (function () {
            try {
                return _require('worker_threads').MessageChannel;
            }
            catch (_) { }
            return undefined;
        })();
    var _setImmediate = typeof setImmediate === 'function'
        ? setImmediate
        : function (callback) {
            if (typeof callback !== 'function') {
                throw new TypeError('The "callback" argument must be of type function');
            }
            if (_MessageChannel) {
                var channel_1 = new _MessageChannel();
                channel_1.port1.onmessage = function () {
                    channel_1.port1.onmessage = null;
                    channel_1 = undefined;
                    callback();
                };
                channel_1.port2.postMessage(null);
            }
            else {
                setTimeout(callback, 0);
            }
        };
    var _Buffer = typeof Buffer === 'function'
        ? Buffer
        : /*#__PURE__*/ (function () {
            try {
                return _require('buffer').Buffer;
            }
            catch (_) { }
            return undefined;
        })();
    var version = "1.9.1";
    var NODE_API_SUPPORTED_VERSION_MIN = 1 /* Version.NODE_API_SUPPORTED_VERSION_MIN */;
    var NODE_API_SUPPORTED_VERSION_MAX = 10 /* Version.NODE_API_SUPPORTED_VERSION_MAX */;
    var NAPI_VERSION_EXPERIMENTAL = 2147483647 /* Version.NAPI_VERSION_EXPERIMENTAL */;
    var NODE_API_DEFAULT_MODULE_API_VERSION = 8 /* Version.NODE_API_DEFAULT_MODULE_API_VERSION */;

    var Handle = /*#__PURE__*/ (function () {
        function Handle(id, value) {
            this.id = id;
            this.value = value;
        }
        Handle.prototype.data = function () {
            return getExternalValue(this.value);
        };
        Handle.prototype.isNumber = function () {
            return typeof this.value === 'number';
        };
        Handle.prototype.isBigInt = function () {
            return typeof this.value === 'bigint';
        };
        Handle.prototype.isString = function () {
            return typeof this.value === 'string';
        };
        Handle.prototype.isFunction = function () {
            return typeof this.value === 'function';
        };
        Handle.prototype.isExternal = function () {
            return isExternal(this.value);
        };
        Handle.prototype.isObject = function () {
            return typeof this.value === 'object' && this.value !== null;
        };
        Handle.prototype.isArray = function () {
            return Array.isArray(this.value);
        };
        Handle.prototype.isArrayBuffer = function () {
            return (this.value instanceof ArrayBuffer);
        };
        Handle.prototype.isTypedArray = function () {
            return (ArrayBuffer.isView(this.value)) && !(this.value instanceof DataView);
        };
        Handle.prototype.isBuffer = function (BufferConstructor) {
            if (ArrayBuffer.isView(this.value))
                return true;
            BufferConstructor !== null && BufferConstructor !== void 0 ? BufferConstructor : (BufferConstructor = _Buffer);
            return typeof BufferConstructor === 'function' && BufferConstructor.isBuffer(this.value);
        };
        Handle.prototype.isDataView = function () {
            return (this.value instanceof DataView);
        };
        Handle.prototype.isDate = function () {
            return (this.value instanceof Date);
        };
        Handle.prototype.isPromise = function () {
            return (this.value instanceof Promise);
        };
        Handle.prototype.isBoolean = function () {
            return typeof this.value === 'boolean';
        };
        Handle.prototype.isUndefined = function () {
            return this.value === undefined;
        };
        Handle.prototype.isSymbol = function () {
            return typeof this.value === 'symbol';
        };
        Handle.prototype.isNull = function () {
            return this.value === null;
        };
        Handle.prototype.dispose = function () {
            this.value = undefined;
        };
        return Handle;
    }());
    var ConstHandle = /*#__PURE__*/ (function (_super) {
        __extends(ConstHandle, _super);
        function ConstHandle(id, value) {
            return _super.call(this, id, value) || this;
        }
        ConstHandle.prototype.dispose = function () { };
        return ConstHandle;
    }(Handle));
    var HandleStore = /*#__PURE__*/ (function () {
        function HandleStore() {
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
        HandleStore.prototype.push = function (value) {
            var h;
            var next = this._next;
            var values = this._values;
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
        };
        HandleStore.prototype.erase = function (start, end) {
            this._next = start;
            var values = this._values;
            for (var i = start; i < end; ++i) {
                values[i].dispose();
            }
        };
        HandleStore.prototype.get = function (id) {
            return this._values[id];
        };
        HandleStore.prototype.swap = function (a, b) {
            var values = this._values;
            var h = values[a];
            values[a] = values[b];
            values[a].id = Number(a);
            values[b] = h;
            h.id = Number(b);
        };
        HandleStore.prototype.dispose = function () {
            this._values.length = HandleStore.MIN_ID;
            this._next = HandleStore.MIN_ID;
        };
        HandleStore.UNDEFINED = new ConstHandle(1 /* GlobalHandle.UNDEFINED */, undefined);
        HandleStore.NULL = new ConstHandle(2 /* GlobalHandle.NULL */, null);
        HandleStore.FALSE = new ConstHandle(3 /* GlobalHandle.FALSE */, false);
        HandleStore.TRUE = new ConstHandle(4 /* GlobalHandle.TRUE */, true);
        HandleStore.GLOBAL = new ConstHandle(5 /* GlobalHandle.GLOBAL */, _global);
        HandleStore.MIN_ID = 6;
        return HandleStore;
    }());

    var HandleScope = /*#__PURE__*/ (function () {
        function HandleScope(handleStore, id, parentScope, start, end) {
            if (end === void 0) { end = start; }
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
        HandleScope.prototype.add = function (value) {
            var h = this.handleStore.push(value);
            this.end++;
            return h;
        };
        HandleScope.prototype.addExternal = function (data) {
            return this.add(new External(data));
        };
        HandleScope.prototype.dispose = function () {
            if (this._escapeCalled)
                this._escapeCalled = false;
            if (this.start === this.end)
                return;
            this.handleStore.erase(this.start, this.end);
        };
        HandleScope.prototype.escape = function (handle) {
            if (this._escapeCalled)
                return null;
            this._escapeCalled = true;
            if (handle < this.start || handle >= this.end) {
                return null;
            }
            this.handleStore.swap(handle, this.start);
            var h = this.handleStore.get(this.start);
            this.start++;
            this.parent.end++;
            return h;
        };
        HandleScope.prototype.escapeCalled = function () {
            return this._escapeCalled;
        };
        return HandleScope;
    }());

    var ScopeStore = /*#__PURE__*/ (function () {
        function ScopeStore() {
            this._rootScope = new HandleScope(null, 0, null, 1, HandleStore.MIN_ID);
            this.currentScope = this._rootScope;
            this._values = [undefined];
        }
        ScopeStore.prototype.get = function (id) {
            return this._values[id];
        };
        ScopeStore.prototype.openScope = function (handleStore) {
            var currentScope = this.currentScope;
            var scope = currentScope.child;
            if (scope !== null) {
                scope.start = scope.end = currentScope.end;
            }
            else {
                var id = currentScope.id + 1;
                scope = new HandleScope(handleStore, id, currentScope, currentScope.end);
                this._values[id] = scope;
            }
            this.currentScope = scope;
            return scope;
        };
        ScopeStore.prototype.closeScope = function () {
            var scope = this.currentScope;
            this.currentScope = scope.parent;
            scope.dispose();
        };
        ScopeStore.prototype.dispose = function () {
            this.currentScope = this._rootScope;
            this._values.length = 1;
        };
        return ScopeStore;
    }());

    var RefTracker = /*#__PURE__*/ (function () {
        function RefTracker() {
            this._next = null;
            this._prev = null;
        }
        /** @virtual */
        RefTracker.prototype.dispose = function () { };
        /** @virtual */
        RefTracker.prototype.finalize = function () { };
        RefTracker.prototype.link = function (list) {
            this._prev = list;
            this._next = list._next;
            if (this._next !== null) {
                this._next._prev = this;
            }
            list._next = this;
        };
        RefTracker.prototype.unlink = function () {
            if (this._prev !== null) {
                this._prev._next = this._next;
            }
            if (this._next !== null) {
                this._next._prev = this._prev;
            }
            this._prev = null;
            this._next = null;
        };
        RefTracker.finalizeAll = function (list) {
            while (list._next !== null) {
                list._next.finalize();
            }
        };
        return RefTracker;
    }());

    var Finalizer = /*#__PURE__*/ (function () {
        function Finalizer(envObject, _finalizeCallback, _finalizeData, _finalizeHint) {
            if (_finalizeCallback === void 0) { _finalizeCallback = 0; }
            if (_finalizeData === void 0) { _finalizeData = 0; }
            if (_finalizeHint === void 0) { _finalizeHint = 0; }
            this.envObject = envObject;
            this._finalizeCallback = _finalizeCallback;
            this._finalizeData = _finalizeData;
            this._finalizeHint = _finalizeHint;
            this._makeDynCall_vppp = envObject.makeDynCall_vppp;
        }
        Finalizer.prototype.callback = function () { return this._finalizeCallback; };
        Finalizer.prototype.data = function () { return this._finalizeData; };
        Finalizer.prototype.hint = function () { return this._finalizeHint; };
        Finalizer.prototype.resetEnv = function () {
            this.envObject = undefined;
        };
        Finalizer.prototype.resetFinalizer = function () {
            this._finalizeCallback = 0;
            this._finalizeData = 0;
            this._finalizeHint = 0;
        };
        Finalizer.prototype.callFinalizer = function () {
            var finalize_callback = this._finalizeCallback;
            var finalize_data = this._finalizeData;
            var finalize_hint = this._finalizeHint;
            this.resetFinalizer();
            if (!finalize_callback)
                return;
            var fini = Number(finalize_callback);
            if (!this.envObject) {
                this._makeDynCall_vppp(fini)(0, finalize_data, finalize_hint);
            }
            else {
                this.envObject.callFinalizer(fini, finalize_data, finalize_hint);
            }
        };
        Finalizer.prototype.dispose = function () {
            this.envObject = undefined;
            this._makeDynCall_vppp = undefined;
        };
        return Finalizer;
    }());

    var TrackedFinalizer = /*#__PURE__*/ (function (_super) {
        __extends(TrackedFinalizer, _super);
        function TrackedFinalizer(envObject, finalize_callback, finalize_data, finalize_hint) {
            var _this = _super.call(this) || this;
            _this._finalizer = new Finalizer(envObject, finalize_callback, finalize_data, finalize_hint);
            return _this;
        }
        TrackedFinalizer.create = function (envObject, finalize_callback, finalize_data, finalize_hint) {
            var finalizer = new TrackedFinalizer(envObject, finalize_callback, finalize_data, finalize_hint);
            finalizer.link(envObject.finalizing_reflist);
            return finalizer;
        };
        TrackedFinalizer.prototype.data = function () {
            return this._finalizer.data();
        };
        TrackedFinalizer.prototype.dispose = function () {
            if (!this._finalizer)
                return;
            this.unlink();
            this._finalizer.envObject.dequeueFinalizer(this);
            this._finalizer.dispose();
            this._finalizer = undefined;
            _super.prototype.dispose.call(this);
        };
        TrackedFinalizer.prototype.finalize = function () {
            this.unlink();
            var error;
            var caught = false;
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
        };
        return TrackedFinalizer;
    }(RefTracker));

    function throwNodeApiVersionError(moduleName, moduleApiVersion) {
        var errorMessage = "".concat(moduleName, " requires Node-API version ").concat(moduleApiVersion, ", but this version of Node.js only supports version ").concat(NODE_API_SUPPORTED_VERSION_MAX, " add-ons.");
        throw new Error(errorMessage);
    }
    function handleThrow(envObject, value) {
        if (envObject.terminatedOrTerminating()) {
            return;
        }
        throw value;
    }
    var Env = /*#__PURE__*/ (function () {
        function Env(ctx, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort) {
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
                errorCode: 0 /* napi_status.napi_ok */,
                engineErrorCode: 0,
                engineReserved: 0
            };
            this.inGcFinalizer = false;
            this._bindingMap = new WeakMap();
            this.id = 0;
        }
        /** @virtual */
        Env.prototype.canCallIntoJs = function () {
            return true;
        };
        Env.prototype.terminatedOrTerminating = function () {
            return !this.canCallIntoJs();
        };
        Env.prototype.ref = function () {
            this.refs++;
        };
        Env.prototype.unref = function () {
            this.refs--;
            if (this.refs === 0) {
                this.dispose();
            }
        };
        Env.prototype.ensureHandle = function (value) {
            return this.ctx.ensureHandle(value);
        };
        Env.prototype.ensureHandleId = function (value) {
            return this.ensureHandle(value).id;
        };
        Env.prototype.clearLastError = function () {
            var lastError = this.lastError;
            if (lastError.errorCode !== 0 /* napi_status.napi_ok */)
                lastError.errorCode = 0 /* napi_status.napi_ok */;
            if (lastError.engineErrorCode !== 0)
                lastError.engineErrorCode = 0;
            if (lastError.engineReserved !== 0)
                lastError.engineReserved = 0;
            return 0 /* napi_status.napi_ok */;
        };
        Env.prototype.setLastError = function (error_code, engine_error_code, engine_reserved) {
            if (engine_error_code === void 0) { engine_error_code = 0; }
            if (engine_reserved === void 0) { engine_reserved = 0; }
            var lastError = this.lastError;
            if (lastError.errorCode !== error_code)
                lastError.errorCode = error_code;
            if (lastError.engineErrorCode !== engine_error_code)
                lastError.engineErrorCode = engine_error_code;
            if (lastError.engineReserved !== engine_reserved)
                lastError.engineReserved = engine_reserved;
            return error_code;
        };
        Env.prototype.getReturnStatus = function () {
            return !this.tryCatch.hasCaught() ? 0 /* napi_status.napi_ok */ : this.setLastError(10 /* napi_status.napi_pending_exception */);
        };
        Env.prototype.callIntoModule = function (fn, handleException) {
            if (handleException === void 0) { handleException = handleThrow; }
            var openHandleScopesBefore = this.openHandleScopes;
            this.clearLastError();
            var r = fn(this);
            if (openHandleScopesBefore !== this.openHandleScopes) {
                this.abort('open_handle_scopes != open_handle_scopes_before');
            }
            if (this.tryCatch.hasCaught()) {
                var err = this.tryCatch.extractException();
                handleException(this, err);
            }
            return r;
        };
        Env.prototype.invokeFinalizerFromGC = function (finalizer) {
            if (this.moduleApiVersion !== NAPI_VERSION_EXPERIMENTAL) {
                this.enqueueFinalizer(finalizer);
            }
            else {
                var saved = this.inGcFinalizer;
                this.inGcFinalizer = true;
                try {
                    finalizer.finalize();
                }
                finally {
                    this.inGcFinalizer = saved;
                }
            }
        };
        Env.prototype.checkGCAccess = function () {
            if (this.moduleApiVersion === NAPI_VERSION_EXPERIMENTAL && this.inGcFinalizer) {
                this.abort('Finalizer is calling a function that may affect GC state.\n' +
                    'The finalizers are run directly from GC and must not affect GC ' +
                    'state.\n' +
                    'Use `node_api_post_finalizer` from inside of the finalizer to work ' +
                    'around this issue.\n' +
                    'It schedules the call as a new task in the event loop.');
            }
        };
        /** @virtual */
        Env.prototype.enqueueFinalizer = function (finalizer) {
            if (this.pendingFinalizers.indexOf(finalizer) === -1) {
                this.pendingFinalizers.push(finalizer);
            }
        };
        /** @virtual */
        Env.prototype.dequeueFinalizer = function (finalizer) {
            var index = this.pendingFinalizers.indexOf(finalizer);
            if (index !== -1) {
                this.pendingFinalizers.splice(index, 1);
            }
        };
        /** @virtual */
        Env.prototype.deleteMe = function () {
            RefTracker.finalizeAll(this.finalizing_reflist);
            RefTracker.finalizeAll(this.reflist);
            this.tryCatch.extractException();
            this.ctx.envStore.remove(this.id);
        };
        Env.prototype.dispose = function () {
            if (this.id === 0)
                return;
            this.deleteMe();
            this.finalizing_reflist.dispose();
            this.reflist.dispose();
            this.id = 0;
        };
        Env.prototype.initObjectBinding = function (value) {
            var binding = {
                wrapped: 0,
                tag: null
            };
            this._bindingMap.set(value, binding);
            return binding;
        };
        Env.prototype.getObjectBinding = function (value) {
            if (this._bindingMap.has(value)) {
                return this._bindingMap.get(value);
            }
            return this.initObjectBinding(value);
        };
        Env.prototype.setInstanceData = function (data, finalize_cb, finalize_hint) {
            if (this.instanceData) {
                this.instanceData.dispose();
            }
            this.instanceData = TrackedFinalizer.create(this, finalize_cb, data, finalize_hint);
        };
        Env.prototype.getInstanceData = function () {
            return this.instanceData ? this.instanceData.data() : 0;
        };
        return Env;
    }());
    var NodeEnv = /*#__PURE__*/ (function (_super) {
        __extends(NodeEnv, _super);
        function NodeEnv(ctx, filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort, nodeBinding) {
            var _this = _super.call(this, ctx, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort) || this;
            _this.filename = filename;
            _this.nodeBinding = nodeBinding;
            _this.destructing = false;
            _this.finalizationScheduled = false;
            return _this;
        }
        NodeEnv.prototype.deleteMe = function () {
            this.destructing = true;
            this.drainFinalizerQueue();
            _super.prototype.deleteMe.call(this);
        };
        NodeEnv.prototype.canCallIntoJs = function () {
            return _super.prototype.canCallIntoJs.call(this) && this.ctx.canCallIntoJs();
        };
        NodeEnv.prototype.triggerFatalException = function (err) {
            if (this.nodeBinding) {
                this.nodeBinding.napi.fatalException(err);
            }
            else {
                if (typeof process === 'object' && process !== null && typeof process._fatalException === 'function') {
                    var handled = process._fatalException(err);
                    if (!handled) {
                        console.error(err);
                        process.exit(1);
                    }
                }
                else {
                    throw err;
                }
            }
        };
        NodeEnv.prototype.callbackIntoModule = function (enforceUncaughtExceptionPolicy, fn) {
            return this.callIntoModule(fn, function (envObject, err) {
                if (envObject.terminatedOrTerminating()) {
                    return;
                }
                var hasProcess = typeof process === 'object' && process !== null;
                var hasForceFlag = hasProcess ? Boolean(process.execArgv && (process.execArgv.indexOf('--force-node-api-uncaught-exceptions-policy') !== -1)) : false;
                if (envObject.moduleApiVersion < 10 && !hasForceFlag && !enforceUncaughtExceptionPolicy) {
                    var warn = hasProcess && typeof process.emitWarning === 'function'
                        ? process.emitWarning
                        : function (warning, type, code) {
                            if (warning instanceof Error) {
                                console.warn(warning.toString());
                            }
                            else {
                                var prefix = code ? "[".concat(code, "] ") : '';
                                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                                console.warn("".concat(prefix).concat(type || 'Warning', ": ").concat(warning));
                            }
                        };
                    warn('Uncaught Node-API callback exception detected, please run node with option --force-node-api-uncaught-exceptions-policy=true to handle those exceptions properly.', 'DeprecationWarning', 'DEP0168');
                    return;
                }
                envObject.triggerFatalException(err);
            });
        };
        NodeEnv.prototype.callFinalizer = function (cb, data, hint) {
            this.callFinalizerInternal(1, cb, data, hint);
        };
        NodeEnv.prototype.callFinalizerInternal = function (forceUncaught, cb, data, hint) {
            var f = this.makeDynCall_vppp(cb);
            var env = this.id;
            var scope = this.ctx.openScope(this);
            try {
                this.callbackIntoModule(Boolean(forceUncaught), function () { f(env, data, hint); });
            }
            finally {
                this.ctx.closeScope(this, scope);
            }
        };
        NodeEnv.prototype.enqueueFinalizer = function (finalizer) {
            var _this = this;
            _super.prototype.enqueueFinalizer.call(this, finalizer);
            if (!this.finalizationScheduled && !this.destructing) {
                this.finalizationScheduled = true;
                this.ref();
                _setImmediate(function () {
                    _this.finalizationScheduled = false;
                    _this.unref();
                    _this.drainFinalizerQueue();
                });
            }
        };
        NodeEnv.prototype.drainFinalizerQueue = function () {
            while (this.pendingFinalizers.length > 0) {
                var refTracker = this.pendingFinalizers.shift();
                refTracker.finalize();
            }
        };
        return NodeEnv;
    }(Env));
    function newEnv(ctx, filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort, nodeBinding) {
        moduleApiVersion = typeof moduleApiVersion !== 'number' ? NODE_API_DEFAULT_MODULE_API_VERSION : moduleApiVersion;
        // Validate module_api_version.
        if (moduleApiVersion < NODE_API_DEFAULT_MODULE_API_VERSION) {
            moduleApiVersion = NODE_API_DEFAULT_MODULE_API_VERSION;
        }
        else if (moduleApiVersion > NODE_API_SUPPORTED_VERSION_MAX && moduleApiVersion !== NAPI_VERSION_EXPERIMENTAL) {
            throwNodeApiVersionError(filename, moduleApiVersion);
        }
        var env = new NodeEnv(ctx, filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort, nodeBinding);
        ctx.envStore.add(env);
        ctx.addCleanupHook(env, function () { env.unref(); }, 0);
        return env;
    }

    var EmnapiError = /*#__PURE__*/ (function (_super) {
        __extends(EmnapiError, _super);
        function EmnapiError(message) {
            var _newTarget = this.constructor;
            var _this = _super.call(this, message) || this;
            var ErrorConstructor = _newTarget;
            var proto = ErrorConstructor.prototype;
            if (!(_this instanceof EmnapiError)) {
                var setPrototypeOf = Object.setPrototypeOf;
                if (typeof setPrototypeOf === 'function') {
                    setPrototypeOf.call(Object, _this, proto);
                }
                else {
                    // eslint-disable-next-line no-proto
                    _this.__proto__ = proto;
                }
                if (typeof Error.captureStackTrace === 'function') {
                    Error.captureStackTrace(_this, ErrorConstructor);
                }
            }
            return _this;
        }
        return EmnapiError;
    }(Error));
    Object.defineProperty(EmnapiError.prototype, 'name', {
        configurable: true,
        writable: true,
        value: 'EmnapiError'
    });
    var NotSupportWeakRefError = /*#__PURE__*/ (function (_super) {
        __extends(NotSupportWeakRefError, _super);
        function NotSupportWeakRefError(api, message) {
            return _super.call(this, "".concat(api, ": The current runtime does not support \"FinalizationRegistry\" and \"WeakRef\".").concat(message ? " ".concat(message) : '')) || this;
        }
        return NotSupportWeakRefError;
    }(EmnapiError));
    Object.defineProperty(NotSupportWeakRefError.prototype, 'name', {
        configurable: true,
        writable: true,
        value: 'NotSupportWeakRefError'
    });
    var NotSupportBufferError = /*#__PURE__*/ (function (_super) {
        __extends(NotSupportBufferError, _super);
        function NotSupportBufferError(api, message) {
            return _super.call(this, "".concat(api, ": The current runtime does not support \"Buffer\". Consider using buffer polyfill to make sure `globalThis.Buffer` is defined.").concat(message ? " ".concat(message) : '')) || this;
        }
        return NotSupportBufferError;
    }(EmnapiError));
    Object.defineProperty(NotSupportBufferError.prototype, 'name', {
        configurable: true,
        writable: true,
        value: 'NotSupportBufferError'
    });

    var StrongRef = /*#__PURE__*/ (function () {
        function StrongRef(value) {
            this._value = value;
        }
        StrongRef.prototype.deref = function () {
            return this._value;
        };
        StrongRef.prototype.dispose = function () {
            this._value = undefined;
        };
        return StrongRef;
    }());
    var Persistent = /*#__PURE__*/ (function () {
        function Persistent(value) {
            this._ref = new StrongRef(value);
        }
        Persistent.prototype.setWeak = function (param, callback) {
            if (!supportFinalizer || this._ref === undefined || this._ref instanceof WeakRef)
                return;
            var value = this._ref.deref();
            try {
                Persistent._registry.register(value, this, this);
                var weakRef = new WeakRef(value);
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
        };
        Persistent.prototype.clearWeak = function () {
            if (!supportFinalizer || this._ref === undefined)
                return;
            if (this._ref instanceof WeakRef) {
                try {
                    Persistent._registry.unregister(this);
                }
                catch (_) { }
                this._param = undefined;
                this._callback = undefined;
                var value = this._ref.deref();
                if (value === undefined) {
                    this._ref = value;
                }
                else {
                    this._ref = new StrongRef(value);
                }
            }
        };
        Persistent.prototype.reset = function () {
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
        };
        Persistent.prototype.isEmpty = function () {
            return this._ref === undefined;
        };
        Persistent.prototype.deref = function () {
            if (this._ref === undefined)
                return undefined;
            return this._ref.deref();
        };
        Persistent._registry = supportFinalizer
            ? new FinalizationRegistry(function (value) {
                value._ref = undefined;
                var callback = value._callback;
                var param = value._param;
                value._callback = undefined;
                value._param = undefined;
                if (typeof callback === 'function') {
                    callback(param);
                }
            })
            : undefined;
        return Persistent;
    }());

    exports.ReferenceOwnership = void 0;
    (function (ReferenceOwnership) {
        ReferenceOwnership[ReferenceOwnership["kRuntime"] = 0] = "kRuntime";
        ReferenceOwnership[ReferenceOwnership["kUserland"] = 1] = "kUserland";
    })(exports.ReferenceOwnership || (exports.ReferenceOwnership = {}));
    function canBeHeldWeakly(value) {
        return value.isObject() || value.isFunction() || value.isSymbol();
    }
    var Reference = /*#__PURE__*/ (function (_super) {
        __extends(Reference, _super);
        function Reference(envObject, handle_id, initialRefcount, ownership) {
            var _this = _super.call(this) || this;
            _this.envObject = envObject;
            _this._refcount = initialRefcount;
            _this._ownership = ownership;
            var handle = envObject.ctx.handleStore.get(handle_id);
            _this.canBeWeak = canBeHeldWeakly(handle);
            _this.persistent = new Persistent(handle.value);
            _this.id = 0;
            if (initialRefcount === 0) {
                _this._setWeak();
            }
            return _this;
        }
        Reference.weakCallback = function (ref) {
            ref.persistent.reset();
            ref.invokeFinalizerFromGC();
        };
        Reference.create = function (envObject, handle_id, initialRefcount, ownership, _unused1, _unused2, _unused3) {
            var ref = new Reference(envObject, handle_id, initialRefcount, ownership);
            envObject.ctx.refStore.add(ref);
            ref.link(envObject.reflist);
            return ref;
        };
        Reference.prototype.ref = function () {
            if (this.persistent.isEmpty()) {
                return 0;
            }
            if (++this._refcount === 1 && this.canBeWeak) {
                this.persistent.clearWeak();
            }
            return this._refcount;
        };
        Reference.prototype.unref = function () {
            if (this.persistent.isEmpty() || this._refcount === 0) {
                return 0;
            }
            if (--this._refcount === 0) {
                this._setWeak();
            }
            return this._refcount;
        };
        Reference.prototype.get = function (envObject) {
            if (envObject === void 0) { envObject = this.envObject; }
            if (this.persistent.isEmpty()) {
                return 0;
            }
            var obj = this.persistent.deref();
            var handle = envObject.ensureHandle(obj);
            return handle.id;
        };
        /** @virtual */
        Reference.prototype.resetFinalizer = function () { };
        /** @virtual */
        Reference.prototype.data = function () { return 0; };
        Reference.prototype.refcount = function () { return this._refcount; };
        Reference.prototype.ownership = function () { return this._ownership; };
        /** @virtual */
        Reference.prototype.callUserFinalizer = function () { };
        /** @virtual */
        Reference.prototype.invokeFinalizerFromGC = function () {
            this.finalize();
        };
        Reference.prototype._setWeak = function () {
            if (this.canBeWeak) {
                this.persistent.setWeak(this, Reference.weakCallback);
            }
            else {
                this.persistent.reset();
            }
        };
        Reference.prototype.finalize = function () {
            this.persistent.reset();
            var deleteMe = this._ownership === exports.ReferenceOwnership.kRuntime;
            this.unlink();
            this.callUserFinalizer();
            if (deleteMe) {
                this.dispose();
            }
        };
        Reference.prototype.dispose = function () {
            if (this.id === 0)
                return;
            this.unlink();
            this.persistent.reset();
            this.envObject.ctx.refStore.remove(this.id);
            _super.prototype.dispose.call(this);
            this.envObject = undefined;
            this.id = 0;
        };
        return Reference;
    }(RefTracker));
    var ReferenceWithData = /*#__PURE__*/ (function (_super) {
        __extends(ReferenceWithData, _super);
        function ReferenceWithData(envObject, value, initialRefcount, ownership, _data) {
            var _this = _super.call(this, envObject, value, initialRefcount, ownership) || this;
            _this._data = _data;
            return _this;
        }
        ReferenceWithData.create = function (envObject, value, initialRefcount, ownership, data) {
            var reference = new ReferenceWithData(envObject, value, initialRefcount, ownership, data);
            envObject.ctx.refStore.add(reference);
            reference.link(envObject.reflist);
            return reference;
        };
        ReferenceWithData.prototype.data = function () {
            return this._data;
        };
        return ReferenceWithData;
    }(Reference));
    var ReferenceWithFinalizer = /*#__PURE__*/ (function (_super) {
        __extends(ReferenceWithFinalizer, _super);
        function ReferenceWithFinalizer(envObject, value, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint) {
            var _this = _super.call(this, envObject, value, initialRefcount, ownership) || this;
            _this._finalizer = new Finalizer(envObject, finalize_callback, finalize_data, finalize_hint);
            return _this;
        }
        ReferenceWithFinalizer.create = function (envObject, value, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint) {
            var reference = new ReferenceWithFinalizer(envObject, value, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint);
            envObject.ctx.refStore.add(reference);
            reference.link(envObject.finalizing_reflist);
            return reference;
        };
        ReferenceWithFinalizer.prototype.resetFinalizer = function () {
            this._finalizer.resetFinalizer();
        };
        ReferenceWithFinalizer.prototype.data = function () {
            return this._finalizer.data();
        };
        ReferenceWithFinalizer.prototype.callUserFinalizer = function () {
            this._finalizer.callFinalizer();
        };
        ReferenceWithFinalizer.prototype.invokeFinalizerFromGC = function () {
            this._finalizer.envObject.invokeFinalizerFromGC(this);
        };
        ReferenceWithFinalizer.prototype.dispose = function () {
            if (!this._finalizer)
                return;
            this._finalizer.envObject.dequeueFinalizer(this);
            this._finalizer.dispose();
            _super.prototype.dispose.call(this);
            this._finalizer = undefined;
        };
        return ReferenceWithFinalizer;
    }(Reference));

    var Deferred = /*#__PURE__*/ (function () {
        function Deferred(ctx, value) {
            this.id = 0;
            this.ctx = ctx;
            this.value = value;
        }
        Deferred.create = function (ctx, value) {
            var deferred = new Deferred(ctx, value);
            ctx.deferredStore.add(deferred);
            return deferred;
        };
        Deferred.prototype.resolve = function (value) {
            this.value.resolve(value);
            this.dispose();
        };
        Deferred.prototype.reject = function (reason) {
            this.value.reject(reason);
            this.dispose();
        };
        Deferred.prototype.dispose = function () {
            this.ctx.deferredStore.remove(this.id);
            this.id = 0;
            this.value = null;
            this.ctx = null;
        };
        return Deferred;
    }());

    var Store = /*#__PURE__*/ (function () {
        function Store() {
            this._values = [undefined];
            this._values.length = 4;
            this._size = 1;
            this._freeList = [];
        }
        Store.prototype.add = function (value) {
            var id;
            if (this._freeList.length) {
                id = this._freeList.shift();
            }
            else {
                id = this._size;
                this._size++;
                var capacity = this._values.length;
                if (id >= capacity) {
                    this._values.length = capacity + (capacity >> 1) + 16;
                }
            }
            value.id = id;
            this._values[id] = value;
        };
        Store.prototype.get = function (id) {
            return this._values[id];
        };
        Store.prototype.has = function (id) {
            return this._values[id] !== undefined;
        };
        Store.prototype.remove = function (id) {
            var value = this._values[id];
            if (value) {
                value.id = 0;
                this._values[id] = undefined;
                this._freeList.push(Number(id));
            }
        };
        Store.prototype.dispose = function () {
            for (var i = 1; i < this._size; ++i) {
                var value = this._values[i];
                value === null || value === void 0 ? void 0 : value.dispose();
            }
            this._values = [undefined];
            this._size = 1;
            this._freeList = [];
        };
        return Store;
    }());

    var CleanupHookCallback = /*#__PURE__*/ (function () {
        function CleanupHookCallback(envObject, fn, arg, order) {
            this.envObject = envObject;
            this.fn = fn;
            this.arg = arg;
            this.order = order;
        }
        return CleanupHookCallback;
    }());
    var CleanupQueue = /*#__PURE__*/ (function () {
        function CleanupQueue() {
            this._cleanupHooks = [];
            this._cleanupHookCounter = 0;
        }
        CleanupQueue.prototype.empty = function () {
            return this._cleanupHooks.length === 0;
        };
        CleanupQueue.prototype.add = function (envObject, fn, arg) {
            if (this._cleanupHooks.filter(function (hook) { return (hook.envObject === envObject && hook.fn === fn && hook.arg === arg); }).length > 0) {
                throw new Error('Can not add same fn and arg twice');
            }
            this._cleanupHooks.push(new CleanupHookCallback(envObject, fn, arg, this._cleanupHookCounter++));
        };
        CleanupQueue.prototype.remove = function (envObject, fn, arg) {
            for (var i = 0; i < this._cleanupHooks.length; ++i) {
                var hook = this._cleanupHooks[i];
                if (hook.envObject === envObject && hook.fn === fn && hook.arg === arg) {
                    this._cleanupHooks.splice(i, 1);
                    return;
                }
            }
        };
        CleanupQueue.prototype.drain = function () {
            var hooks = this._cleanupHooks.slice();
            hooks.sort(function (a, b) { return (b.order - a.order); });
            for (var i = 0; i < hooks.length; ++i) {
                var cb = hooks[i];
                if (typeof cb.fn === 'number') {
                    cb.envObject.makeDynCall_vp(cb.fn)(cb.arg);
                }
                else {
                    cb.fn(cb.arg);
                }
                this._cleanupHooks.splice(this._cleanupHooks.indexOf(cb), 1);
            }
        };
        CleanupQueue.prototype.dispose = function () {
            this._cleanupHooks.length = 0;
            this._cleanupHookCounter = 0;
        };
        return CleanupQueue;
    }());
    var NodejsWaitingRequestCounter = /*#__PURE__*/ (function () {
        function NodejsWaitingRequestCounter() {
            this.refHandle = new _MessageChannel().port1;
            this.count = 0;
        }
        NodejsWaitingRequestCounter.prototype.increase = function () {
            if (this.count === 0) {
                if (this.refHandle.ref) {
                    this.refHandle.ref();
                }
            }
            this.count++;
        };
        NodejsWaitingRequestCounter.prototype.decrease = function () {
            if (this.count === 0)
                return;
            if (this.count === 1) {
                if (this.refHandle.unref) {
                    this.refHandle.unref();
                }
            }
            this.count--;
        };
        return NodejsWaitingRequestCounter;
    }());
    var Context = /*#__PURE__*/ (function () {
        function Context() {
            var _this = this;
            this._isStopping = false;
            this._canCallIntoJs = true;
            this._suppressDestroy = false;
            this.envStore = new Store();
            this.scopeStore = new ScopeStore();
            this.refStore = new Store();
            this.deferredStore = new Store();
            this.handleStore = new HandleStore();
            this.feature = {
                supportReflect: supportReflect,
                supportFinalizer: supportFinalizer,
                supportWeakSymbol: supportWeakSymbol,
                supportBigInt: supportBigInt,
                supportNewFunction: supportNewFunction,
                canSetFunctionName: canSetFunctionName,
                setImmediate: _setImmediate,
                Buffer: _Buffer,
                MessageChannel: _MessageChannel
            };
            this.cleanupQueue = new CleanupQueue();
            if (typeof process === 'object' && process !== null && typeof process.once === 'function') {
                this.refCounter = new NodejsWaitingRequestCounter();
                process.once('beforeExit', function () {
                    if (!_this._suppressDestroy) {
                        _this.destroy();
                    }
                });
            }
        }
        /**
         * Suppress the destroy on `beforeExit` event in Node.js.
         * Call this method if you want to keep the context and
         * all associated {@link Env | Env} alive,
         * this also means that cleanup hooks will not be called.
         * After call this method, you should call
         * {@link Context.destroy | `Context.prototype.destroy`} method manually.
         */
        Context.prototype.suppressDestroy = function () {
            this._suppressDestroy = true;
        };
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        Context.prototype.getRuntimeVersions = function () {
            return {
                version: version,
                NODE_API_SUPPORTED_VERSION_MAX: NODE_API_SUPPORTED_VERSION_MAX,
                NAPI_VERSION_EXPERIMENTAL: NAPI_VERSION_EXPERIMENTAL,
                NODE_API_DEFAULT_MODULE_API_VERSION: NODE_API_DEFAULT_MODULE_API_VERSION
            };
        };
        Context.prototype.createNotSupportWeakRefError = function (api, message) {
            return new NotSupportWeakRefError(api, message);
        };
        Context.prototype.createNotSupportBufferError = function (api, message) {
            return new NotSupportBufferError(api, message);
        };
        Context.prototype.createReference = function (envObject, handle_id, initialRefcount, ownership) {
            return Reference.create(envObject, handle_id, initialRefcount, ownership);
        };
        Context.prototype.createReferenceWithData = function (envObject, handle_id, initialRefcount, ownership, data) {
            return ReferenceWithData.create(envObject, handle_id, initialRefcount, ownership, data);
        };
        Context.prototype.createReferenceWithFinalizer = function (envObject, handle_id, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint) {
            if (finalize_callback === void 0) { finalize_callback = 0; }
            if (finalize_data === void 0) { finalize_data = 0; }
            if (finalize_hint === void 0) { finalize_hint = 0; }
            return ReferenceWithFinalizer.create(envObject, handle_id, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint);
        };
        Context.prototype.createDeferred = function (value) {
            return Deferred.create(this, value);
        };
        Context.prototype.createEnv = function (filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort, nodeBinding) {
            return newEnv(this, filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort, nodeBinding);
        };
        Context.prototype.createTrackedFinalizer = function (envObject, finalize_callback, finalize_data, finalize_hint) {
            return TrackedFinalizer.create(envObject, finalize_callback, finalize_data, finalize_hint);
        };
        Context.prototype.getCurrentScope = function () {
            return this.scopeStore.currentScope;
        };
        Context.prototype.addToCurrentScope = function (value) {
            return this.scopeStore.currentScope.add(value);
        };
        Context.prototype.openScope = function (envObject) {
            var scope = this.scopeStore.openScope(this.handleStore);
            if (envObject)
                envObject.openHandleScopes++;
            return scope;
        };
        Context.prototype.closeScope = function (envObject, _scope) {
            if (envObject && envObject.openHandleScopes === 0)
                return;
            this.scopeStore.closeScope();
            if (envObject)
                envObject.openHandleScopes--;
        };
        Context.prototype.ensureHandle = function (value) {
            switch (value) {
                case undefined: return HandleStore.UNDEFINED;
                case null: return HandleStore.NULL;
                case true: return HandleStore.TRUE;
                case false: return HandleStore.FALSE;
                case _global: return HandleStore.GLOBAL;
            }
            return this.addToCurrentScope(value);
        };
        Context.prototype.addCleanupHook = function (envObject, fn, arg) {
            this.cleanupQueue.add(envObject, fn, arg);
        };
        Context.prototype.removeCleanupHook = function (envObject, fn, arg) {
            this.cleanupQueue.remove(envObject, fn, arg);
        };
        Context.prototype.runCleanup = function () {
            while (!this.cleanupQueue.empty()) {
                this.cleanupQueue.drain();
            }
        };
        Context.prototype.increaseWaitingRequestCounter = function () {
            var _a;
            (_a = this.refCounter) === null || _a === void 0 ? void 0 : _a.increase();
        };
        Context.prototype.decreaseWaitingRequestCounter = function () {
            var _a;
            (_a = this.refCounter) === null || _a === void 0 ? void 0 : _a.decrease();
        };
        Context.prototype.setCanCallIntoJs = function (value) {
            this._canCallIntoJs = value;
        };
        Context.prototype.setStopping = function (value) {
            this._isStopping = value;
        };
        Context.prototype.canCallIntoJs = function () {
            return this._canCallIntoJs && !this._isStopping;
        };
        /**
         * Destroy the context and call cleanup hooks.
         * Associated {@link Env | Env} will be destroyed.
         */
        Context.prototype.destroy = function () {
            this.setStopping(true);
            this.setCanCallIntoJs(false);
            this.runCleanup();
        };
        return Context;
    }());
    var defaultContext;
    function createContext() {
        return new Context();
    }
    function getDefaultContext() {
        if (!defaultContext) {
            defaultContext = createContext();
        }
        return defaultContext;
    }

    exports.ConstHandle = ConstHandle;
    exports.Context = Context;
    exports.Deferred = Deferred;
    exports.EmnapiError = EmnapiError;
    exports.Env = Env;
    exports.External = External;
    exports.Finalizer = Finalizer;
    exports.Handle = Handle;
    exports.HandleScope = HandleScope;
    exports.HandleStore = HandleStore;
    exports.NAPI_VERSION_EXPERIMENTAL = NAPI_VERSION_EXPERIMENTAL;
    exports.NODE_API_DEFAULT_MODULE_API_VERSION = NODE_API_DEFAULT_MODULE_API_VERSION;
    exports.NODE_API_SUPPORTED_VERSION_MAX = NODE_API_SUPPORTED_VERSION_MAX;
    exports.NODE_API_SUPPORTED_VERSION_MIN = NODE_API_SUPPORTED_VERSION_MIN;
    exports.NodeEnv = NodeEnv;
    exports.NotSupportBufferError = NotSupportBufferError;
    exports.NotSupportWeakRefError = NotSupportWeakRefError;
    exports.Persistent = Persistent;
    exports.RefTracker = RefTracker;
    exports.Reference = Reference;
    exports.ReferenceWithData = ReferenceWithData;
    exports.ReferenceWithFinalizer = ReferenceWithFinalizer;
    exports.ScopeStore = ScopeStore;
    exports.Store = Store;
    exports.TrackedFinalizer = TrackedFinalizer;
    exports.TryCatch = TryCatch;
    exports.createContext = createContext;
    exports.getDefaultContext = getDefaultContext;
    exports.getExternalValue = getExternalValue;
    exports.isExternal = isExternal;
    exports.isReferenceType = isReferenceType;
    exports.version = version;

    return exports;

})({});
