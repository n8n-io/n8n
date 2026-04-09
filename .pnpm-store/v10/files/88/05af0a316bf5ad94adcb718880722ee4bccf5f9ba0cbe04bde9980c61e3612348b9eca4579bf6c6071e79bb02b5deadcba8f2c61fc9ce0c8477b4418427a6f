import { ThreadManager, WASIThreads, ThreadMessageHandler } from '@emnapi/wasi-threads';
export * from '@emnapi/wasi-threads';
import { __extends, __assign } from 'tslib';

/* eslint-disable no-undef */
var _WebAssembly = typeof WebAssembly !== 'undefined'
    ? WebAssembly
    : typeof WXWebAssembly !== 'undefined'
        ? WXWebAssembly
        : undefined;
function validateImports(imports) {
    if (imports && typeof imports !== 'object') {
        throw new TypeError('imports must be an object or undefined');
    }
    return true;
}
function load(wasmInput, imports) {
    if (!wasmInput)
        throw new TypeError('Invalid wasm source');
    validateImports(imports);
    imports = imports !== null && imports !== void 0 ? imports : {};
    // Promise<string | URL | Response | BufferSource | WebAssembly.Module>
    try {
        var then = typeof wasmInput === 'object' && wasmInput !== null && 'then' in wasmInput ? wasmInput.then : undefined;
        if (typeof then === 'function') {
            return then.call(wasmInput, function (input) { return load(input, imports); });
        }
    }
    catch (_) { }
    // BufferSource
    if (wasmInput instanceof ArrayBuffer || ArrayBuffer.isView(wasmInput)) {
        return _WebAssembly.instantiate(wasmInput, imports);
    }
    // WebAssembly.Module
    if (wasmInput instanceof _WebAssembly.Module) {
        return _WebAssembly.instantiate(wasmInput, imports).then(function (instance) {
            return { instance: instance, module: wasmInput };
        });
    }
    // Response
    if (typeof Response !== 'undefined' && wasmInput instanceof Response) {
        return wasmInput.arrayBuffer().then(function (buffer) {
            return _WebAssembly.instantiate(buffer, imports);
        });
    }
    // string | URL
    var inputIsString = typeof wasmInput === 'string';
    if (inputIsString || (typeof URL !== 'undefined' && wasmInput instanceof URL)) {
        if (inputIsString && typeof wx !== 'undefined' && typeof __wxConfig !== 'undefined') {
            return _WebAssembly.instantiate(wasmInput, imports);
        }
        if (typeof fetch !== 'function') {
            throw new TypeError('wasm source can not be a string or URL in this environment');
        }
        if (typeof _WebAssembly.instantiateStreaming === 'function') {
            try {
                return _WebAssembly.instantiateStreaming(fetch(wasmInput), imports).catch(function () {
                    return load(fetch(wasmInput), imports);
                });
            }
            catch (_) {
                return load(fetch(wasmInput), imports);
            }
        }
        else {
            return load(fetch(wasmInput), imports);
        }
    }
    throw new TypeError('Invalid wasm source');
}
function loadSync(wasmInput, imports) {
    if (!wasmInput)
        throw new TypeError('Invalid wasm source');
    validateImports(imports);
    imports = imports !== null && imports !== void 0 ? imports : {};
    var module;
    if ((wasmInput instanceof ArrayBuffer) || ArrayBuffer.isView(wasmInput)) {
        module = new _WebAssembly.Module(wasmInput);
    }
    else if (wasmInput instanceof WebAssembly.Module) {
        module = wasmInput;
    }
    else {
        throw new TypeError('Invalid wasm source');
    }
    var instance = new _WebAssembly.Instance(module, imports);
    var source = { instance: instance, module: module };
    return source;
}

function createNapiModule(options) {
    var napiModule = (function () {
        var ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null && typeof process.versions === 'object' && process.versions !== null && typeof process.versions.node === 'string';
        var ENVIRONMENT_IS_PTHREAD = Boolean(options.childThread);
        var waitThreadStart = typeof options.waitThreadStart === 'number' ? options.waitThreadStart : Boolean(options.waitThreadStart);
        var wasmInstance;
        var wasmMemory;
        var wasmTable;
        var _malloc;
        var _free;
        function abort(msg) {
            if (typeof _WebAssembly.RuntimeError === 'function') {
                throw new _WebAssembly.RuntimeError(msg);
            }
            throw Error(msg);
        }
        var napiModule = {
            imports: {
                env: {},
                napi: {},
                emnapi: {}
            },
            exports: {},
            emnapi: {},
            loaded: false,
            filename: '',
            childThread: ENVIRONMENT_IS_PTHREAD,
            initWorker: undefined,
            waitThreadStart: waitThreadStart,
            PThread: undefined,
            init: function (options) {
                if (napiModule.loaded)
                    return napiModule.exports;
                if (!options)
                    throw new TypeError('Invalid napi init options');
                var instance = options.instance;
                if (!(instance === null || instance === void 0 ? void 0 : instance.exports))
                    throw new TypeError('Invalid wasm instance');
                wasmInstance = instance;
                var exports$1 = instance.exports;
                var module = options.module;
                var memory = options.memory || exports$1.memory;
                var table = options.table || exports$1.__indirect_function_table;
                if (!(module instanceof _WebAssembly.Module))
                    throw new TypeError('Invalid wasm module');
                if (!(memory instanceof _WebAssembly.Memory))
                    throw new TypeError('Invalid wasm memory');
                if (!(table instanceof _WebAssembly.Table))
                    throw new TypeError('Invalid wasm table');
                wasmMemory = memory;
                wasmTable = table;
                if (typeof exports$1.malloc !== 'function')
                    throw new TypeError('malloc is not exported');
                if (typeof exports$1.free !== 'function')
                    throw new TypeError('free is not exported');
                _malloc = exports$1.malloc;
                _free = exports$1.free;
                if (!napiModule.childThread) {
                    // main thread only
                    var moduleApiVersion = 8 /* Version.NODE_API_DEFAULT_MODULE_API_VERSION */;
                    var node_api_module_get_api_version_v1 = instance.exports.node_api_module_get_api_version_v1;
                    if (typeof node_api_module_get_api_version_v1 === 'function') {
                        moduleApiVersion = node_api_module_get_api_version_v1();
                    }
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    var envObject = napiModule.envObject || (napiModule.envObject = emnapiCtx.createEnv(napiModule.filename, moduleApiVersion, function (cb) { return (wasmTable.get(cb)); }, function (cb) { return (wasmTable.get(cb)); }, abort, emnapiNodeBinding));
                    var scope_1 = emnapiCtx.openScope(envObject);
                    try {
                        envObject.callIntoModule(function (_envObject) {
                            var exports$1 = napiModule.exports;
                            var exportsHandle = scope_1.add(exports$1);
                            var napi_register_wasm_v1 = instance.exports.napi_register_wasm_v1;
                            var napiValue = napi_register_wasm_v1(_envObject.id, exportsHandle.id);
                            napiModule.exports = (!napiValue) ? exports$1 : emnapiCtx.handleStore.get(napiValue).value;
                        });
                    }
                    catch (e) {
                        if (e !== 'unwind') {
                            throw e;
                        }
                    }
                    finally {
                        emnapiCtx.closeScope(envObject, scope_1);
                    }
                    napiModule.loaded = true;
                    delete napiModule.envObject;
                    return napiModule.exports;
                }
            }
        };
        var emnapiCtx;
        var emnapiNodeBinding;
        var onCreateWorker = undefined;
        var err;
        if (!ENVIRONMENT_IS_PTHREAD) {
            var context = options.context;
            if (typeof context !== 'object' || context === null) {
                throw new TypeError("Invalid `options.context`. Use `import { getDefaultContext } from '@emnapi/runtime'`");
            }
            emnapiCtx = context;
        }
        else {
            emnapiCtx = options === null || options === void 0 ? void 0 : options.context;
            var postMsg = typeof options.postMessage === 'function'
                ? options.postMessage
                : typeof postMessage === 'function'
                    ? postMessage
                    : undefined;
            if (typeof postMsg !== 'function') {
                throw new TypeError('No postMessage found');
            }
            napiModule.postMessage = postMsg;
        }
        if (typeof options.filename === 'string') {
            napiModule.filename = options.filename;
        }
        if (typeof options.onCreateWorker === 'function') {
            onCreateWorker = options.onCreateWorker;
        }
        if (typeof options.print === 'function') {
            options.print;
        }
        else {
            console.log.bind(console);
        }
        if (typeof options.printErr === 'function') {
            err = options.printErr;
        }
        else {
            err = console.warn.bind(console);
        }
        if ('nodeBinding' in options) {
            var nodeBinding = options.nodeBinding;
            if (typeof nodeBinding !== 'object' || nodeBinding === null) {
                throw new TypeError('Invalid `options.nodeBinding`. Use @emnapi/node-binding package');
            }
            emnapiNodeBinding = nodeBinding;
        }
        var emnapiAsyncWorkPoolSize = 0;
        if ('asyncWorkPoolSize' in options) {
            if (typeof options.asyncWorkPoolSize !== 'number') {
                throw new TypeError('options.asyncWorkPoolSize must be a integer');
            }
            emnapiAsyncWorkPoolSize = options.asyncWorkPoolSize >> 0;
            if (emnapiAsyncWorkPoolSize > 1024) {
                emnapiAsyncWorkPoolSize = 1024;
            }
            else if (emnapiAsyncWorkPoolSize < -1024) {
                emnapiAsyncWorkPoolSize = -1024;
            }
        }
        var singleThreadAsyncWork = ENVIRONMENT_IS_PTHREAD ? false : (emnapiAsyncWorkPoolSize <= 0);
        function _emnapi_async_work_pool_size() {
            return Math.abs(emnapiAsyncWorkPoolSize);
        }
        napiModule.imports.env._emnapi_async_work_pool_size = _emnapi_async_work_pool_size;
        // ------------------------------ pthread -------------------------------
        function emnapiAddSendListener(worker) {
            if (!worker)
                return false;
            if (worker._emnapiSendListener)
                return true;
            var handler = function (e) {
                var data = ENVIRONMENT_IS_NODE ? e : e.data;
                var __emnapi__ = data.__emnapi__;
                if (__emnapi__ && __emnapi__.type === 'async-send') {
                    if (ENVIRONMENT_IS_PTHREAD) {
                        var postMessage_1 = napiModule.postMessage;
                        postMessage_1({ __emnapi__: __emnapi__ });
                    }
                    else {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        var callback = __emnapi__.payload.callback;
                        (wasmTable.get(callback))(__emnapi__.payload.data);
                    }
                }
            };
            var dispose = function () {
                if (ENVIRONMENT_IS_NODE) {
                    worker.off('message', handler);
                }
                else {
                    worker.removeEventListener('message', handler, false);
                }
                delete worker._emnapiSendListener;
            };
            worker._emnapiSendListener = { handler: handler, dispose: dispose };
            if (ENVIRONMENT_IS_NODE) {
                worker.on('message', handler);
            }
            else {
                worker.addEventListener('message', handler, false);
            }
            return true;
        }
        napiModule.emnapi.addSendListener = emnapiAddSendListener;
        var PThread = new ThreadManager(ENVIRONMENT_IS_PTHREAD
            ? {
                printErr: err,
                childThread: true
            }
            : {
                printErr: err,
                beforeLoad: function (worker) {
                    emnapiAddSendListener(worker);
                },
                reuseWorker: options.reuseWorker,
                onCreateWorker: onCreateWorker
            });
        napiModule.PThread = PThread;
        /**
         * @__sig ipiip
         */
        function napi_set_last_error(env, error_code, engine_error_code, engine_reserved) {
            var envObject = emnapiCtx.envStore.get(env);
            return envObject.setLastError(error_code, engine_error_code, engine_reserved);
        }
        /**
         * @__sig ip
         */
        function napi_clear_last_error(env) {
            var envObject = emnapiCtx.envStore.get(env);
            return envObject.clearLastError();
        }
        /**
         * @__sig vppp
         */
        function _emnapi_get_node_version(major, minor, patch) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var versions = (typeof process === 'object' && process !== null &&
                typeof process.versions === 'object' && process.versions !== null &&
                typeof process.versions.node === 'string')
                ? process.versions.node.split('.').map(function (n) { return Number(n); })
                : [0, 0, 0];
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(major, versions[0], true);
            HEAP_DATA_VIEW.setUint32(minor, versions[1], true);
            HEAP_DATA_VIEW.setUint32(patch, versions[2], true);
        }
        /**
         * @__sig v
         * @__deps $runtimeKeepalivePush
         */
        function _emnapi_runtime_keepalive_push() {
        }
        /**
         * @__sig v
         * @__deps $runtimeKeepalivePop
         */
        function _emnapi_runtime_keepalive_pop() {
        }
        /**
         * @__sig vpp
         */
        function _emnapi_set_immediate(callback, data) {
            emnapiCtx.feature.setImmediate(function () {
                (wasmTable.get(callback))(data);
            });
        }
        /**
         * @__sig vpp
         */
        function _emnapi_next_tick(callback, data) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            Promise.resolve().then(function () {
                (wasmTable.get(callback))(data);
            });
        }
        /**
         * @__sig vipppi
         */
        function _emnapi_callback_into_module(forceUncaught, env, callback, data, close_scope_if_throw) {
            var envObject = emnapiCtx.envStore.get(env);
            var scope = emnapiCtx.openScope(envObject);
            try {
                envObject.callbackIntoModule(Boolean(forceUncaught), function () {
                    (wasmTable.get(callback))(env, data);
                });
            }
            catch (err) {
                emnapiCtx.closeScope(envObject, scope);
                if (close_scope_if_throw) {
                    emnapiCtx.closeScope(envObject);
                }
                throw err;
            }
            emnapiCtx.closeScope(envObject, scope);
        }
        /**
         * @__sig vipppp
         */
        function _emnapi_call_finalizer(forceUncaught, env, callback, data, hint) {
            var envObject = emnapiCtx.envStore.get(env);
            envObject.callFinalizerInternal(forceUncaught, callback, data, hint);
        }
        /**
         * @__sig v
         */
        function _emnapi_ctx_increase_waiting_request_counter() {
            emnapiCtx.increaseWaitingRequestCounter();
        }
        /**
         * @__sig v
         */
        function _emnapi_ctx_decrease_waiting_request_counter() {
            emnapiCtx.decreaseWaitingRequestCounter();
        }
        /**
         * @__sig i
         */
        function _emnapi_is_main_runtime_thread() {
            return ENVIRONMENT_IS_PTHREAD ? 0 : 1;
        }
        /**
         * @__sig i
         */
        function _emnapi_is_main_browser_thread() {
            return (typeof window !== 'undefined' && typeof document !== 'undefined' && !ENVIRONMENT_IS_NODE) ? 1 : 0;
        }
        /**
         * @__sig v
         */
        function _emnapi_unwind() {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal
            throw 'unwind';
        }
        /**
         * @__sig d
         */
        function _emnapi_get_now() {
            return performance.timeOrigin + performance.now();
        }
        function $emnapiSetValueI64(result, numberValue) {
            var tempDouble;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var tempI64 = [
                numberValue >>> 0,
                (tempDouble = numberValue, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)
            ];
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt32(result, tempI64[0], true);
            HEAP_DATA_VIEW.setInt32(result + 4, tempI64[1], true);
        }
        /**
         * @__deps $emnapiCtx
         * @__sig p
         */
        function _emnapi_open_handle_scope() {
            return emnapiCtx.openScope().id;
        }
        /**
         * @__deps $emnapiCtx
         * @__sig vp
         */
        function _emnapi_close_handle_scope(_scope) {
            return emnapiCtx.closeScope();
        }
        var utilMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            $emnapiSetValueI64: $emnapiSetValueI64,
            _emnapi_call_finalizer: _emnapi_call_finalizer,
            _emnapi_callback_into_module: _emnapi_callback_into_module,
            _emnapi_close_handle_scope: _emnapi_close_handle_scope,
            _emnapi_ctx_decrease_waiting_request_counter: _emnapi_ctx_decrease_waiting_request_counter,
            _emnapi_ctx_increase_waiting_request_counter: _emnapi_ctx_increase_waiting_request_counter,
            _emnapi_get_node_version: _emnapi_get_node_version,
            _emnapi_get_now: _emnapi_get_now,
            _emnapi_is_main_browser_thread: _emnapi_is_main_browser_thread,
            _emnapi_is_main_runtime_thread: _emnapi_is_main_runtime_thread,
            _emnapi_next_tick: _emnapi_next_tick,
            _emnapi_open_handle_scope: _emnapi_open_handle_scope,
            _emnapi_runtime_keepalive_pop: _emnapi_runtime_keepalive_pop,
            _emnapi_runtime_keepalive_push: _emnapi_runtime_keepalive_push,
            _emnapi_set_immediate: _emnapi_set_immediate,
            _emnapi_unwind: _emnapi_unwind,
            napi_clear_last_error: napi_clear_last_error,
            napi_set_last_error: napi_set_last_error
        });
        function emnapiGetWorkerByPthreadPtr(pthreadPtr) {
            var view = new DataView(wasmMemory.buffer);
            /**
             * wasi-sdk-20.0+threads
             *
             * struct pthread {
             *   struct pthread *self;        // 0
             *   struct pthread *prev, *next; // 4, 8
             *   uintptr_t sysinfo;           // 12
             *   uintptr_t canary;            // 16
             *   int tid;                     // 20
             *   // ...
             * }
             */
            var tidOffset = 20;
            var tid = view.getInt32(pthreadPtr + tidOffset, true);
            var worker = PThread.pthreads[tid];
            return worker;
        }
        /** @__sig vp */
        function _emnapi_worker_ref(pthreadPtr) {
            if (ENVIRONMENT_IS_PTHREAD)
                return;
            var worker = emnapiGetWorkerByPthreadPtr(pthreadPtr);
            if (worker && typeof worker.ref === 'function') {
                worker.ref();
            }
        }
        /** @__sig vp */
        function _emnapi_worker_unref(pthreadPtr) {
            if (ENVIRONMENT_IS_PTHREAD)
                return;
            var worker = emnapiGetWorkerByPthreadPtr(pthreadPtr);
            if (worker && typeof worker.unref === 'function') {
                worker.unref();
            }
        }
        /** @__sig vipp */
        function _emnapi_async_send_js(type, callback, data) {
            if (ENVIRONMENT_IS_PTHREAD) {
                var postMessage_1 = napiModule.postMessage;
                postMessage_1({
                    __emnapi__: {
                        type: 'async-send',
                        payload: {
                            callback: callback,
                            data: data
                        }
                    }
                });
            }
            else {
                switch (type) {
                    case 0:
                        _emnapi_set_immediate(callback, data);
                        break;
                    case 1:
                        _emnapi_next_tick(callback, data);
                        break;
                }
            }
        }
        // function ptrToString (ptr: number): string {
        //   return '0x' + ('00000000' + ptr.toString(16)).slice(-8)
        // }
        var uvThreadpoolReadyResolve;
        var uvThreadpoolReady = new Promise(function (resolve) {
            uvThreadpoolReadyResolve = function () {
                uvThreadpoolReady.ready = true;
                resolve();
            };
        });
        uvThreadpoolReady.ready = false;
        /** @__sig vppi */
        function _emnapi_after_uvthreadpool_ready(callback, q, type) {
            if (uvThreadpoolReady.ready) {
                (wasmTable.get(callback))(q, type);
            }
            else {
                uvThreadpoolReady.then(function () {
                    (wasmTable.get(callback))(q, type);
                });
            }
        }
        /** @__sig vpi */
        function _emnapi_tell_js_uvthreadpool(threads, size) {
            var p = [];
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            var _loop_1 = function (i) {
                var pthreadPtr = HEAP_DATA_VIEW.getUint32(threads + i * 4, true);
                var worker = emnapiGetWorkerByPthreadPtr(pthreadPtr);
                p.push(new Promise(function (resolve) {
                    var handler = function (e) {
                        var data = ENVIRONMENT_IS_NODE ? e : e.data;
                        var __emnapi__ = data.__emnapi__;
                        if (__emnapi__ && __emnapi__.type === 'async-thread-ready') {
                            resolve();
                            if (worker && typeof worker.unref === 'function') {
                                worker.unref();
                            }
                            if (ENVIRONMENT_IS_NODE) {
                                worker.off('message', handler);
                            }
                            else {
                                worker.removeEventListener('message', handler);
                            }
                        }
                    };
                    if (ENVIRONMENT_IS_NODE) {
                        worker.on('message', handler);
                    }
                    else {
                        worker.addEventListener('message', handler);
                    }
                }));
            };
            for (var i = 0; i < size; i++) {
                _loop_1(i);
            }
            Promise.all(p).then(uvThreadpoolReadyResolve);
        }
        /** @__sig v */
        function _emnapi_emit_async_thread_ready() {
            if (!ENVIRONMENT_IS_PTHREAD)
                return;
            var postMessage = napiModule.postMessage;
            postMessage({
                __emnapi__: {
                    type: 'async-thread-ready',
                    payload: {}
                }
            });
        }
        var asyncMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            _emnapi_after_uvthreadpool_ready: _emnapi_after_uvthreadpool_ready,
            _emnapi_async_send_js: _emnapi_async_send_js,
            _emnapi_emit_async_thread_ready: _emnapi_emit_async_thread_ready,
            _emnapi_tell_js_uvthreadpool: _emnapi_tell_js_uvthreadpool,
            _emnapi_worker_ref: _emnapi_worker_ref,
            _emnapi_worker_unref: _emnapi_worker_unref
        });
        /* eslint-disable @typescript-eslint/indent */
        /** @__sig ipjp */
        function napi_adjust_external_memory(env, change_in_bytes, adjusted_value) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            var envObject = emnapiCtx.envStore.get(env);
            if (!adjusted_value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var change_in_bytes_number = Number(change_in_bytes);
            if (change_in_bytes_number < 0) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            var old_size = wasmMemory.buffer.byteLength;
            var new_size = old_size + change_in_bytes_number;
            new_size = new_size + ((65536 - new_size % 65536) % 65536);
            if (wasmMemory.grow((new_size - old_size + 65535) >> 16) === -1) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            if (emnapiCtx.feature.supportBigInt) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setBigInt64(adjusted_value, BigInt(wasmMemory.buffer.byteLength), true);
            }
            else {
                $emnapiSetValueI64(adjusted_value, wasmMemory.buffer.byteLength);
            }
            return envObject.clearLastError();
        }
        var memoryMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            napi_adjust_external_memory: napi_adjust_external_memory
        });
        /**
         * @__postset
         * ```
         * emnapiAWST.init();
         * ```
         */
        var emnapiAWST = {
            idGen: {},
            values: [undefined],
            queued: new Set(),
            pending: [],
            init: function () {
                var idGen = {
                    nextId: 1,
                    list: [],
                    generate: function () {
                        var id;
                        if (idGen.list.length) {
                            id = idGen.list.shift();
                        }
                        else {
                            id = idGen.nextId;
                            idGen.nextId++;
                        }
                        return id;
                    },
                    reuse: function (id) {
                        idGen.list.push(id);
                    }
                };
                emnapiAWST.idGen = idGen;
                emnapiAWST.values = [undefined];
                emnapiAWST.queued = new Set();
                emnapiAWST.pending = [];
            },
            create: function (env, resource, resourceName, execute, complete, data) {
                var asyncId = 0;
                var triggerAsyncId = 0;
                if (emnapiNodeBinding) {
                    var asyncContext = emnapiNodeBinding.node.emitAsyncInit(resource, resourceName, -1);
                    asyncId = asyncContext.asyncId;
                    triggerAsyncId = asyncContext.triggerAsyncId;
                }
                var id = emnapiAWST.idGen.generate();
                emnapiAWST.values[id] = {
                    env: env,
                    id: id,
                    resource: resource,
                    asyncId: asyncId,
                    triggerAsyncId: triggerAsyncId,
                    status: 0,
                    execute: execute,
                    complete: complete,
                    data: data
                };
                return id;
            },
            callComplete: function (work, status) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var complete = work.complete;
                var env = work.env;
                var data = work.data;
                var callback = function () {
                    if (!complete)
                        return;
                    var envObject = emnapiCtx.envStore.get(env);
                    var scope = emnapiCtx.openScope(envObject);
                    try {
                        envObject.callbackIntoModule(true, function () {
                            (wasmTable.get(complete))(env, status, data);
                        });
                    }
                    finally {
                        emnapiCtx.closeScope(envObject, scope);
                    }
                };
                if (emnapiNodeBinding) {
                    emnapiNodeBinding.node.makeCallback(work.resource, callback, [], {
                        asyncId: work.asyncId,
                        triggerAsyncId: work.triggerAsyncId
                    });
                }
                else {
                    callback();
                }
            },
            queue: function (id) {
                var work = emnapiAWST.values[id];
                if (!work)
                    return;
                if (work.status === 0) {
                    work.status = 1;
                    if (emnapiAWST.queued.size >= (Math.abs(emnapiAsyncWorkPoolSize) || 4)) {
                        emnapiAWST.pending.push(id);
                        return;
                    }
                    emnapiAWST.queued.add(id);
                    var env_1 = work.env;
                    var data_1 = work.data;
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    var execute = work.execute;
                    work.status = 2;
                    emnapiCtx.feature.setImmediate(function () {
                        (wasmTable.get(execute))(env_1, data_1);
                        emnapiAWST.queued.delete(id);
                        work.status = 3;
                        emnapiCtx.feature.setImmediate(function () {
                            emnapiAWST.callComplete(work, 0 /* napi_status.napi_ok */);
                        });
                        if (emnapiAWST.pending.length > 0) {
                            var nextWorkId = emnapiAWST.pending.shift();
                            emnapiAWST.values[nextWorkId].status = 0;
                            emnapiAWST.queue(nextWorkId);
                        }
                    });
                }
            },
            cancel: function (id) {
                var index = emnapiAWST.pending.indexOf(id);
                if (index !== -1) {
                    var work_1 = emnapiAWST.values[id];
                    if (work_1 && (work_1.status === 1)) {
                        work_1.status = 4;
                        emnapiAWST.pending.splice(index, 1);
                        emnapiCtx.feature.setImmediate(function () {
                            emnapiAWST.callComplete(work_1, 11 /* napi_status.napi_cancelled */);
                        });
                        return 0 /* napi_status.napi_ok */;
                    }
                    else {
                        return 9 /* napi_status.napi_generic_failure */;
                    }
                }
                return 9 /* napi_status.napi_generic_failure */;
            },
            remove: function (id) {
                var work = emnapiAWST.values[id];
                if (!work)
                    return;
                if (emnapiNodeBinding) {
                    emnapiNodeBinding.node.emitAsyncDestroy({
                        asyncId: work.asyncId,
                        triggerAsyncId: work.triggerAsyncId
                    });
                }
                emnapiAWST.values[id] = undefined;
                emnapiAWST.idGen.reuse(id);
            }
        };
        /** @__sig vppdp */
        function _emnapi_node_emit_async_init(async_resource, async_resource_name, trigger_async_id, result) {
            if (!emnapiNodeBinding)
                return;
            var resource = emnapiCtx.handleStore.get(async_resource).value;
            var resource_name = emnapiCtx.handleStore.get(async_resource_name).value;
            var asyncContext = emnapiNodeBinding.node.emitAsyncInit(resource, resource_name, trigger_async_id);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var asyncId = asyncContext.asyncId;
            var triggerAsyncId = asyncContext.triggerAsyncId;
            if (result) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setFloat64(result, asyncId, true);
                HEAP_DATA_VIEW.setFloat64(result + 8, triggerAsyncId, true);
            }
        }
        /** @__sig vdd */
        function _emnapi_node_emit_async_destroy(async_id, trigger_async_id) {
            if (!emnapiNodeBinding)
                return;
            emnapiNodeBinding.node.emitAsyncDestroy({
                asyncId: async_id,
                triggerAsyncId: trigger_async_id
            });
        }
        /* vpddp export function _emnapi_node_open_callback_scope (async_resource: napi_value, async_id: double, trigger_async_id: double, result: Pointer<int64_t>): void {
          if (!emnapiNodeBinding || !result) return
          const resource = emnapiCtx.handleStore.get(async_resource)!.value
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const nativeCallbackScopePointer = emnapiNodeBinding.node.openCallbackScope(resource, {
            asyncId: async_id,
            triggerAsyncId: trigger_async_id
          })
    
          from64('result')
          $_TODO_makeSetValue('result', 0, 'nativeCallbackScopePointer', 'i64')
        }
    
        vp
        export function _emnapi_node_close_callback_scope (scope: Pointer<int64_t>): void {
          if (!emnapiNodeBinding || !scope) return
          from64('scope')
          const nativeCallbackScopePointer = $_TODO_makeGetValue('scope', 0, 'i64')
          emnapiNodeBinding.node.closeCallbackScope(BigInt(nativeCallbackScopePointer))
        } */
        /** @__sig ipppppddp */
        function _emnapi_node_make_callback(env, async_resource, cb, argv, size, async_id, trigger_async_id, result) {
            var i = 0;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v;
            if (!emnapiNodeBinding)
                return;
            var resource = emnapiCtx.handleStore.get(async_resource).value;
            var callback = emnapiCtx.handleStore.get(cb).value;
            size = size >>> 0;
            var arr = Array(size);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            for (; i < size; i++) {
                var argVal = HEAP_DATA_VIEW.getUint32(argv + i * 4, true);
                arr[i] = emnapiCtx.handleStore.get(argVal).value;
            }
            var ret = emnapiNodeBinding.node.makeCallback(resource, callback, arr, {
                asyncId: async_id,
                triggerAsyncId: trigger_async_id
            });
            if (result) {
                var envObject = emnapiCtx.envStore.get(env);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                v = envObject.ensureHandleId(ret);
                HEAP_DATA_VIEW.setUint32(result, v, true);
            }
        }
        /** @__sig ippp */
        function _emnapi_async_init_js(async_resource, async_resource_name, result) {
            if (!emnapiNodeBinding) {
                return 9 /* napi_status.napi_generic_failure */;
            }
            var resource;
            if (async_resource) {
                resource = Object(emnapiCtx.handleStore.get(async_resource).value);
            }
            var name = emnapiCtx.handleStore.get(async_resource_name).value;
            var ret = emnapiNodeBinding.napi.asyncInit(resource, name);
            if (ret.status !== 0)
                return ret.status;
            var numberValue = ret.value;
            if (!((numberValue >= (BigInt(-1) * (BigInt(1) << BigInt(63)))) && (numberValue < (BigInt(1) << BigInt(63))))) {
                numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1));
                if (numberValue >= (BigInt(1) << BigInt(63))) {
                    numberValue = numberValue - (BigInt(1) << BigInt(64));
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var low = Number(numberValue & BigInt(0xffffffff));
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var high = Number(numberValue >> BigInt(32));
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt32(result, low, true);
            HEAP_DATA_VIEW.setInt32(result + 4, high, true);
            return 0 /* napi_status.napi_ok */;
        }
        /** @__sig ip */
        function _emnapi_async_destroy_js(async_context) {
            if (!emnapiNodeBinding) {
                return 9 /* napi_status.napi_generic_failure */;
            }
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            var low = HEAP_DATA_VIEW.getInt32(async_context, true);
            var high = HEAP_DATA_VIEW.getInt32(async_context + 4, true);
            var pointer = BigInt(low >>> 0) | (BigInt(high) << BigInt(32));
            var ret = emnapiNodeBinding.napi.asyncDestroy(pointer);
            if (ret.status !== 0)
                return ret.status;
            return 0 /* napi_status.napi_ok */;
        }
        // https://github.com/nodejs/node-addon-api/pull/1283
        /** @__sig ipppp */
        function napi_open_callback_scope(env, ignored, async_context_handle, result) {
            throw new Error('napi_open_callback_scope has not been implemented yet');
        }
        /** @__sig ipp */
        function napi_close_callback_scope(env, scope) {
            throw new Error('napi_close_callback_scope has not been implemented yet');
        }
        /** @__sig ippppppp */
        function napi_make_callback(env, async_context, recv, func, argc, argv, result) {
            var i = 0;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!emnapiNodeBinding) {
                    return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
                }
                if (!recv)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (argc > 0) {
                    if (!argv)
                        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var v8recv = Object(emnapiCtx.handleStore.get(recv).value);
                var v8func = emnapiCtx.handleStore.get(func).value;
                if (typeof v8func !== 'function') {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                var low = HEAP_DATA_VIEW.getInt32(async_context, true);
                var high = HEAP_DATA_VIEW.getInt32(async_context + 4, true);
                var ctx = BigInt(low >>> 0) | (BigInt(high) << BigInt(32));
                argc = argc >>> 0;
                var arr = Array(argc);
                for (; i < argc; i++) {
                    var argVal = HEAP_DATA_VIEW.getUint32(argv + i * 4, true);
                    arr[i] = emnapiCtx.handleStore.get(argVal).value;
                }
                var ret = emnapiNodeBinding.napi.makeCallback(ctx, v8recv, v8func, arr);
                if (ret.error) {
                    throw ret.error;
                }
                if (ret.status !== 0 /* napi_status.napi_ok */)
                    return envObject.setLastError(ret.status);
                if (result) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    v = envObject.ensureHandleId(ret.value);
                    HEAP_DATA_VIEW.setUint32(result, v, true);
                }
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig vp */
        function _emnapi_env_check_gc_access(env) {
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
        }
        var nodeMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            _emnapi_async_destroy_js: _emnapi_async_destroy_js,
            _emnapi_async_init_js: _emnapi_async_init_js,
            _emnapi_env_check_gc_access: _emnapi_env_check_gc_access,
            _emnapi_node_emit_async_destroy: _emnapi_node_emit_async_destroy,
            _emnapi_node_emit_async_init: _emnapi_node_emit_async_init,
            _emnapi_node_make_callback: _emnapi_node_make_callback,
            napi_close_callback_scope: napi_close_callback_scope,
            napi_make_callback: napi_make_callback,
            napi_open_callback_scope: napi_open_callback_scope
        });
        /**
         * @__deps malloc
         * @__deps free
         * @__postset
         * ```
         * emnapiTSFN.init();
         * ```
         */
        var emnapiTSFN = {
            offset: {
                __size__: 0,
                /* napi_ref */ resource: 0,
                /* double */ async_id: 0,
                /* double */ trigger_async_id: 0,
                /* size_t */ queue_size: 0,
                /* bool */ is_some: 0,
                /* void* */ queue: 0,
                /* size_t */ thread_count: 0,
                /* int32_t */ state: 0,
                /* atomic_uchar */ dispatch_state: 0,
                /* void* */ context: 0,
                /* size_t */ max_queue_size: 0,
                /* napi_ref */ ref: 0,
                /* napi_env */ env: 0,
                /* void* */ finalize_data: 0,
                /* napi_finalize */ finalize_cb: 0,
                /* napi_threadsafe_function_call_js */ call_js_cb: 0,
                /* bool */ handles_closing: 0,
                /* bool */ async_ref: 0,
                /* int32_t */ mutex: 0,
                /* int32_t */ cond: 0
            },
            init: function () {
                emnapiTSFN.offset.__size__ = 184 /* NapiTSFNOffset32.__size__ */;
                emnapiTSFN.offset.resource = 0 /* NapiTSFNOffset32.async_resource_resource */;
                emnapiTSFN.offset.async_id = 8 /* NapiTSFNOffset32.async_resource_async_context_async_id */;
                emnapiTSFN.offset.trigger_async_id = 16 /* NapiTSFNOffset32.async_resource_async_context_trigger_async_id */;
                emnapiTSFN.offset.queue_size = 60 /* NapiTSFNOffset32.queue_size */;
                emnapiTSFN.offset.is_some = 24 /* NapiTSFNOffset32.async_resource_is_some */;
                emnapiTSFN.offset.queue = 64 /* NapiTSFNOffset32.queue */;
                emnapiTSFN.offset.thread_count = 136 /* NapiTSFNOffset32.thread_count */;
                emnapiTSFN.offset.state = 140 /* NapiTSFNOffset32.state */;
                emnapiTSFN.offset.dispatch_state = 144 /* NapiTSFNOffset32.dispatch_state */;
                emnapiTSFN.offset.context = 148 /* NapiTSFNOffset32.context */;
                emnapiTSFN.offset.max_queue_size = 152 /* NapiTSFNOffset32.max_queue_size */;
                emnapiTSFN.offset.ref = 156 /* NapiTSFNOffset32.ref */;
                emnapiTSFN.offset.env = 160 /* NapiTSFNOffset32.env */;
                emnapiTSFN.offset.finalize_data = 164 /* NapiTSFNOffset32.finalize_data */;
                emnapiTSFN.offset.finalize_cb = 168 /* NapiTSFNOffset32.finalize_cb */;
                emnapiTSFN.offset.call_js_cb = 172 /* NapiTSFNOffset32.call_js_cb */;
                emnapiTSFN.offset.handles_closing = 176 /* NapiTSFNOffset32.handles_closing */;
                emnapiTSFN.offset.async_ref = 180 /* NapiTSFNOffset32.async_ref */;
                emnapiTSFN.offset.mutex = 32 /* NapiTSFNOffset32.mutex */;
                emnapiTSFN.offset.cond = 56 /* NapiTSFNOffset32.cond */;
                emnapiTSFN.offset.mutex = emnapiTSFN.offset.mutex + 4;
                if (typeof PThread !== 'undefined') {
                    PThread.unusedWorkers.forEach(emnapiTSFN.addListener);
                    PThread.runningWorkers.forEach(emnapiTSFN.addListener);
                    var __original_getNewWorker_1 = PThread.getNewWorker;
                    PThread.getNewWorker = function () {
                        var r = __original_getNewWorker_1.apply(this, arguments);
                        emnapiTSFN.addListener(r);
                        return r;
                    };
                }
            },
            addListener: function (worker) {
                if (!worker)
                    return false;
                if (worker._emnapiTSFNListener)
                    return true;
                var handler = function (e) {
                    var data = ENVIRONMENT_IS_NODE ? e : e.data;
                    var __emnapi__ = data.__emnapi__;
                    if (__emnapi__) {
                        var type = __emnapi__.type;
                        var payload = __emnapi__.payload;
                        if (type === 'tsfn-send') {
                            emnapiTSFN.dispatch(payload.tsfn);
                        }
                    }
                };
                var dispose = function () {
                    if (ENVIRONMENT_IS_NODE) {
                        worker.off('message', handler);
                    }
                    else {
                        worker.removeEventListener('message', handler, false);
                    }
                    delete worker._emnapiTSFNListener;
                };
                worker._emnapiTSFNListener = { handler: handler, dispose: dispose };
                if (ENVIRONMENT_IS_NODE) {
                    worker.on('message', handler);
                }
                else {
                    worker.addEventListener('message', handler, false);
                }
                return true;
            },
            initQueue: function (func) {
                var size = 2 * 4;
                var queue = _malloc(size);
                if (!queue)
                    return false;
                new Uint8Array(wasmMemory.buffer, queue, size).fill(0);
                emnapiTSFN.storeSizeTypeValue(func + emnapiTSFN.offset.queue, queue, false);
                return true;
            },
            destroyQueue: function (func) {
                var queue = emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue, false);
                if (queue) {
                    _free(queue);
                }
            },
            pushQueue: function (func, data) {
                var queue = emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue, false);
                var head = emnapiTSFN.loadSizeTypeValue(queue, false);
                var tail = emnapiTSFN.loadSizeTypeValue(queue + 4, false);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var size = 2 * 4;
                var node = _malloc(size);
                if (!node)
                    throw new Error('OOM');
                emnapiTSFN.storeSizeTypeValue(node, data, false);
                emnapiTSFN.storeSizeTypeValue(node + 4, 0, false);
                if (head === 0 && tail === 0) {
                    emnapiTSFN.storeSizeTypeValue(queue, node, false);
                    emnapiTSFN.storeSizeTypeValue(queue + 4, node, false);
                }
                else {
                    emnapiTSFN.storeSizeTypeValue(tail + 4, node, false);
                    emnapiTSFN.storeSizeTypeValue(queue + 4, node, false);
                }
                emnapiTSFN.addQueueSize(func);
            },
            shiftQueue: function (func) {
                var queue = emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue, false);
                var head = emnapiTSFN.loadSizeTypeValue(queue, false);
                if (head === 0)
                    return 0;
                var node = head;
                var next = emnapiTSFN.loadSizeTypeValue(head + 4, false);
                emnapiTSFN.storeSizeTypeValue(queue, next, false);
                if (next === 0) {
                    emnapiTSFN.storeSizeTypeValue(queue + 4, 0, false);
                }
                emnapiTSFN.storeSizeTypeValue(node + 4, 0, false);
                var value = emnapiTSFN.loadSizeTypeValue(node, false);
                _free(node);
                emnapiTSFN.subQueueSize(func);
                return value;
            },
            push: function (func, data, mode) {
                var mutex = emnapiTSFN.getMutex(func);
                var cond = emnapiTSFN.getCond(func);
                var waitCondition = function () {
                    var queueSize = emnapiTSFN.getQueueSize(func);
                    var maxSize = emnapiTSFN.getMaxQueueSize(func);
                    return queueSize >= maxSize && maxSize > 0 && emnapiTSFN.getState(func) === 0 /* State.kOpen */;
                };
                var isBrowserMain = typeof window !== 'undefined' && typeof document !== 'undefined' && !ENVIRONMENT_IS_NODE;
                var shouldDelete = false;
                var ret = mutex.execute(function () {
                    while (waitCondition()) {
                        if (mode === 0 /* napi_threadsafe_function_call_mode.napi_tsfn_nonblocking */) {
                            return 15 /* napi_status.napi_queue_full */;
                        }
                        /**
                         * Browser JS main thread can not use `Atomics.wait`
                         *
                         * Related:
                         * https://github.com/nodejs/node/pull/32689
                         * https://github.com/nodejs/node/pull/33453
                         */
                        if (isBrowserMain) {
                            return 21 /* napi_status.napi_would_deadlock */;
                        }
                        cond.wait();
                    }
                    if (emnapiTSFN.getState(func) === 0 /* State.kOpen */) {
                        emnapiTSFN.pushQueue(func, data);
                        emnapiTSFN.send(func);
                        return 0 /* napi_status.napi_ok */;
                    }
                    if (emnapiTSFN.getThreadCount(func) === 0) {
                        return 1 /* napi_status.napi_invalid_arg */;
                    }
                    emnapiTSFN.subThreadCount(func);
                    if (!(emnapiTSFN.getState(func) === 2 /* State.kClosed */ && emnapiTSFN.getThreadCount(func) === 0)) {
                        return 16 /* napi_status.napi_closing */;
                    }
                    shouldDelete = true;
                    return 16 /* napi_status.napi_closing */;
                });
                if (shouldDelete) {
                    emnapiTSFN.destroy(func);
                }
                return ret;
            },
            getMutex: function (func) {
                var index = func + emnapiTSFN.offset.mutex;
                var mutex = {
                    lock: function () {
                        var isBrowserMain = typeof window !== 'undefined' && typeof document !== 'undefined' && !ENVIRONMENT_IS_NODE;
                        var i32a = new Int32Array(wasmMemory.buffer, index, 1);
                        if (isBrowserMain) {
                            while (true) {
                                var oldValue = Atomics.compareExchange(i32a, 0, 0, 10);
                                if (oldValue === 0) {
                                    return;
                                }
                            }
                        }
                        else {
                            while (true) {
                                var oldValue = Atomics.compareExchange(i32a, 0, 0, 10);
                                if (oldValue === 0) {
                                    return;
                                }
                                Atomics.wait(i32a, 0, 10);
                            }
                        }
                    },
                    /* lockAsync () {
                      return new Promise<void>(resolve => {
                        const again = (): void => { fn() }
                        const fn = (): void => {
                          const i32a = new Int32Array(wasmMemory.buffer, index, 1)
                          const oldValue = Atomics.compareExchange(i32a, 0, 0, 10)
                          if (oldValue === 0) {
                            resolve()
                            return
                          }
                          (Atomics as any).waitAsync(i32a, 0, 10).value.then(again)
                        }
                        fn()
                      })
                    }, */
                    unlock: function () {
                        var i32a = new Int32Array(wasmMemory.buffer, index, 1);
                        var oldValue = Atomics.compareExchange(i32a, 0, 10, 0);
                        if (oldValue !== 10) {
                            throw new Error('Tried to unlock while not holding the mutex');
                        }
                        Atomics.notify(i32a, 0, 1);
                    },
                    execute: function (fn) {
                        mutex.lock();
                        try {
                            return fn();
                        }
                        finally {
                            mutex.unlock();
                        }
                    } /* ,
                    executeAsync<T> (fn: () => Promise<T>): Promise<T> {
                      return mutex.lockAsync().then(() => {
                        const r = fn()
                        mutex.unlock()
                        return r
                      }, (err) => {
                        mutex.unlock()
                        throw err
                      })
                    } */
                };
                return mutex;
            },
            getCond: function (func) {
                var index = func + emnapiTSFN.offset.cond;
                var mutex = emnapiTSFN.getMutex(func);
                var cond = {
                    wait: function () {
                        var i32a = new Int32Array(wasmMemory.buffer, index, 1);
                        var value = Atomics.load(i32a, 0);
                        mutex.unlock();
                        Atomics.wait(i32a, 0, value);
                        mutex.lock();
                    },
                    /* waitAsync () {
                      const i32a = new Int32Array(wasmMemory.buffer, index, 1)
                      const value = Atomics.load(i32a, 0)
                      mutex.unlock()
                      const lock = (): Promise<void> => mutex.lockAsync()
                      try {
                        return (Atomics as any).waitAsync(i32a, 0, value).value.then(lock, lock)
                      } catch (err) {
                        return lock()
                      }
                    }, */
                    signal: function () {
                        var i32a = new Int32Array(wasmMemory.buffer, index, 1);
                        Atomics.add(i32a, 0, 1);
                        Atomics.notify(i32a, 0, 1);
                    }
                };
                return cond;
            },
            getQueueSize: function (func) {
                return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue_size, true);
            },
            addQueueSize: function (func) {
                var offset = emnapiTSFN.offset.queue_size;
                var arr, index;
                arr = new Uint32Array(wasmMemory.buffer);
                index = (func + offset) >> 2;
                Atomics.add(arr, index, 1);
            },
            subQueueSize: function (func) {
                var offset = emnapiTSFN.offset.queue_size;
                var arr, index;
                arr = new Uint32Array(wasmMemory.buffer);
                index = (func + offset) >> 2;
                Atomics.sub(arr, index, 1);
            },
            getThreadCount: function (func) {
                return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.thread_count, true);
            },
            addThreadCount: function (func) {
                var offset = emnapiTSFN.offset.thread_count;
                var arr, index;
                arr = new Uint32Array(wasmMemory.buffer);
                index = (func + offset) >> 2;
                Atomics.add(arr, index, 1);
            },
            subThreadCount: function (func) {
                var offset = emnapiTSFN.offset.thread_count;
                var arr, index;
                arr = new Uint32Array(wasmMemory.buffer);
                index = (func + offset) >> 2;
                Atomics.sub(arr, index, 1);
            },
            getState: function (func) {
                return Atomics.load(new Int32Array(wasmMemory.buffer), (func + emnapiTSFN.offset.state) >> 2);
            },
            setState: function (func, value) {
                Atomics.store(new Int32Array(wasmMemory.buffer), (func + emnapiTSFN.offset.state) >> 2, value);
            },
            getHandlesClosing: function (func) {
                return Atomics.load(new Int8Array(wasmMemory.buffer), (func + emnapiTSFN.offset.handles_closing));
            },
            setHandlesClosing: function (func, value) {
                Atomics.store(new Int8Array(wasmMemory.buffer), (func + emnapiTSFN.offset.handles_closing), value);
            },
            getDispatchState: function (func) {
                return Atomics.load(new Uint32Array(wasmMemory.buffer), (func + emnapiTSFN.offset.dispatch_state) >> 2);
            },
            getContext: function (func) {
                return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.context, false);
            },
            getMaxQueueSize: function (func) {
                return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.max_queue_size, true);
            },
            getEnv: function (func) {
                return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.env, false);
            },
            getCallJSCb: function (func) {
                return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.call_js_cb, false);
            },
            getRef: function (func) {
                return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.ref, false);
            },
            getResource: function (func) {
                return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.resource, false);
            },
            getFinalizeCb: function (func) {
                return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.finalize_cb, false);
            },
            getFinalizeData: function (func) {
                return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.finalize_data, false);
            },
            loadSizeTypeValue: function (offset, unsigned) {
                var ret;
                var arr;
                if (unsigned) {
                    arr = new Uint32Array(wasmMemory.buffer);
                    ret = Atomics.load(arr, offset >> 2);
                    return ret;
                }
                else {
                    arr = new Int32Array(wasmMemory.buffer);
                    ret = Atomics.load(arr, offset >> 2);
                    return ret;
                }
            },
            storeSizeTypeValue: function (offset, value, unsigned) {
                var arr;
                if (unsigned) {
                    arr = new Uint32Array(wasmMemory.buffer);
                    Atomics.store(arr, offset >> 2, value);
                    return undefined;
                }
                else {
                    arr = new Int32Array(wasmMemory.buffer);
                    Atomics.store(arr, offset >> 2, value >>> 0);
                    return undefined;
                }
            },
            releaseResources: function (func) {
                if (emnapiTSFN.getState(func) !== 2 /* State.kClosed */) {
                    emnapiTSFN.setState(func, 2 /* State.kClosed */);
                    var env = emnapiTSFN.getEnv(func);
                    var envObject = emnapiCtx.envStore.get(env);
                    var ref = emnapiTSFN.getRef(func);
                    if (ref) {
                        emnapiCtx.refStore.get(ref).dispose();
                    }
                    var resource = emnapiTSFN.getResource(func);
                    emnapiCtx.refStore.get(resource).dispose();
                    var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                    HEAP_DATA_VIEW.setInt8(func + emnapiTSFN.offset.is_some, 0, true);
                    emnapiCtx.removeCleanupHook(envObject, emnapiTSFN.cleanup, func);
                    envObject.unref();
                    var asyncRefOffset = (func + emnapiTSFN.offset.async_ref) >> 2;
                    var arr = new Uint32Array(wasmMemory.buffer);
                    if (Atomics.load(arr, asyncRefOffset) > 0) {
                        Atomics.store(arr, asyncRefOffset, 0);
                        emnapiCtx.decreaseWaitingRequestCounter();
                    }
                    if (emnapiNodeBinding) {
                        var view = new DataView(wasmMemory.buffer);
                        var asyncId = view.getFloat64(func + emnapiTSFN.offset.async_id, true);
                        var triggerAsyncId = view.getFloat64(func + emnapiTSFN.offset.trigger_async_id, true);
                        _emnapi_node_emit_async_destroy(asyncId, triggerAsyncId);
                    }
                }
            },
            destroy: function (func) {
                emnapiTSFN.destroyQueue(func);
                emnapiTSFN.releaseResources(func);
                _free(func);
            },
            emptyQueue: function (func) {
                var drainQueue = [];
                emnapiTSFN.getMutex(func).execute(function () {
                    while (emnapiTSFN.getQueueSize(func) > 0) {
                        drainQueue.push(emnapiTSFN.shiftQueue(func));
                    }
                });
                var callJsCb = emnapiTSFN.getCallJSCb(func);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var context = emnapiTSFN.getContext(func);
                var data;
                for (var i = 0; i < drainQueue.length; i++) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    data = drainQueue[i];
                    if (callJsCb) {
                        (wasmTable.get(callJsCb))(0, 0, context, data);
                    }
                }
            },
            maybeDelete: function (func) {
                var shouldDelete = false;
                emnapiTSFN.getMutex(func).execute(function () {
                    if (emnapiTSFN.getThreadCount(func) > 0) {
                        emnapiTSFN.releaseResources(func);
                    }
                    else {
                        shouldDelete = true;
                    }
                });
                if (shouldDelete) {
                    emnapiTSFN.destroy(func);
                }
            },
            finalize: function (func) {
                var env = emnapiTSFN.getEnv(func);
                var envObject = emnapiCtx.envStore.get(env);
                emnapiCtx.openScope(envObject);
                var finalize = emnapiTSFN.getFinalizeCb(func);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var data = emnapiTSFN.getFinalizeData(func);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var context = emnapiTSFN.getContext(func);
                var f = function () {
                    envObject.callFinalizerInternal(0, finalize, data, context);
                };
                try {
                    emnapiTSFN.emptyQueue(func);
                    if (finalize) {
                        if (emnapiNodeBinding) {
                            var resource = emnapiTSFN.getResource(func);
                            var resource_value = emnapiCtx.refStore.get(resource).get();
                            var resourceObject = emnapiCtx.handleStore.get(resource_value).value;
                            var view = new DataView(wasmMemory.buffer);
                            var asyncId = view.getFloat64(func + emnapiTSFN.offset.async_id, true);
                            var triggerAsyncId = view.getFloat64(func + emnapiTSFN.offset.trigger_async_id, true);
                            emnapiNodeBinding.node.makeCallback(resourceObject, f, [], {
                                asyncId: asyncId,
                                triggerAsyncId: triggerAsyncId
                            });
                        }
                        else {
                            f();
                        }
                    }
                    emnapiTSFN.maybeDelete(func);
                }
                finally {
                    emnapiCtx.closeScope(envObject);
                }
            },
            cleanup: function (func) {
                emnapiTSFN.closeHandlesAndMaybeDelete(func, 1);
            },
            closeHandlesAndMaybeDelete: function (func, set_closing) {
                var env = emnapiTSFN.getEnv(func);
                var envObject = emnapiCtx.envStore.get(env);
                emnapiCtx.openScope(envObject);
                try {
                    if (set_closing) {
                        emnapiTSFN.getMutex(func).execute(function () {
                            emnapiTSFN.setState(func, 1 /* State.kClosing */);
                            if (emnapiTSFN.getMaxQueueSize(func) > 0) {
                                emnapiTSFN.getCond(func).signal();
                            }
                        });
                    }
                    if (emnapiTSFN.getHandlesClosing(func)) {
                        return;
                    }
                    emnapiTSFN.setHandlesClosing(func, 1);
                    emnapiCtx.feature.setImmediate(function () {
                        emnapiTSFN.finalize(func);
                    });
                }
                finally {
                    emnapiCtx.closeScope(envObject);
                }
            },
            dispatchOne: function (func) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var data = 0;
                var popped_value = false;
                var has_more = false;
                var mutex = emnapiTSFN.getMutex(func);
                var cond = emnapiTSFN.getCond(func);
                mutex.execute(function () {
                    if (emnapiTSFN.getState(func) === 0 /* State.kOpen */) {
                        var size = emnapiTSFN.getQueueSize(func);
                        if (size > 0) {
                            data = emnapiTSFN.shiftQueue(func);
                            popped_value = true;
                            var maxQueueSize = emnapiTSFN.getMaxQueueSize(func);
                            if (size === maxQueueSize && maxQueueSize > 0) {
                                cond.signal();
                            }
                            size--;
                        }
                        if (size === 0) {
                            if (emnapiTSFN.getThreadCount(func) === 0) {
                                emnapiTSFN.setState(func, 1 /* State.kClosing */);
                                if (emnapiTSFN.getMaxQueueSize(func) > 0) {
                                    cond.signal();
                                }
                                emnapiTSFN.closeHandlesAndMaybeDelete(func, 0);
                            }
                        }
                        else {
                            has_more = true;
                        }
                    }
                    else {
                        emnapiTSFN.closeHandlesAndMaybeDelete(func, 0);
                    }
                });
                if (popped_value) {
                    var env = emnapiTSFN.getEnv(func);
                    var envObject_1 = emnapiCtx.envStore.get(env);
                    emnapiCtx.openScope(envObject_1);
                    var f = function () {
                        envObject_1.callbackIntoModule(false, function () {
                            var callJsCb = emnapiTSFN.getCallJSCb(func);
                            var ref = emnapiTSFN.getRef(func);
                            var js_callback = ref ? emnapiCtx.refStore.get(ref).get() : 0;
                            if (callJsCb) {
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                var context = emnapiTSFN.getContext(func);
                                (wasmTable.get(callJsCb))(env, js_callback, context, data);
                            }
                            else {
                                var jsCallback = js_callback ? emnapiCtx.handleStore.get(js_callback).value : null;
                                if (typeof jsCallback === 'function') {
                                    jsCallback();
                                }
                            }
                        });
                    };
                    try {
                        if (emnapiNodeBinding) {
                            var resource = emnapiTSFN.getResource(func);
                            var resource_value = emnapiCtx.refStore.get(resource).get();
                            var resourceObject = emnapiCtx.handleStore.get(resource_value).value;
                            var view = new DataView(wasmMemory.buffer);
                            emnapiNodeBinding.node.makeCallback(resourceObject, f, [], {
                                asyncId: view.getFloat64(func + emnapiTSFN.offset.async_id, true),
                                triggerAsyncId: view.getFloat64(func + emnapiTSFN.offset.trigger_async_id, true)
                            });
                        }
                        else {
                            f();
                        }
                    }
                    finally {
                        emnapiCtx.closeScope(envObject_1);
                    }
                }
                return has_more;
            },
            dispatch: function (func) {
                var has_more = true;
                var iterations_left = 1000;
                var ui32a = new Uint32Array(wasmMemory.buffer);
                var index = (func + emnapiTSFN.offset.dispatch_state) >> 2;
                while (has_more && --iterations_left !== 0) {
                    Atomics.store(ui32a, index, 1);
                    has_more = emnapiTSFN.dispatchOne(func);
                    if (Atomics.exchange(ui32a, index, 0) !== 1) {
                        has_more = true;
                    }
                }
                if (has_more) {
                    emnapiTSFN.send(func);
                }
            },
            send: function (func) {
                var current_state = Atomics.or(new Uint32Array(wasmMemory.buffer), (func + emnapiTSFN.offset.dispatch_state) >> 2, 1 << 1);
                if ((current_state & 1) === 1) {
                    return;
                }
                if ((typeof ENVIRONMENT_IS_PTHREAD !== 'undefined') && ENVIRONMENT_IS_PTHREAD) {
                    postMessage({
                        __emnapi__: {
                            type: 'tsfn-send',
                            payload: {
                                tsfn: func
                            }
                        }
                    });
                }
                else {
                    emnapiCtx.feature.setImmediate(function () {
                        emnapiTSFN.dispatch(func);
                    });
                }
            }
        };
        /** @__sig ippppppppppp */
        function napi_create_threadsafe_function(env, func, async_resource, async_resource_name, max_queue_size, initial_thread_count, thread_finalize_data, thread_finalize_cb, context, call_js_cb, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!async_resource_name)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            max_queue_size = max_queue_size >>> 0;
            initial_thread_count = initial_thread_count >>> 0;
            if (initial_thread_count === 0) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var ref = 0;
            if (!func) {
                if (!call_js_cb)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            else {
                var funcValue = emnapiCtx.handleStore.get(func).value;
                if (typeof funcValue !== 'function') {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                ref = emnapiCtx.createReference(envObject, func, 1, 1 /* ReferenceOwnership.kUserland */).id;
            }
            var asyncResourceObject;
            if (async_resource) {
                asyncResourceObject = emnapiCtx.handleStore.get(async_resource).value;
                if (asyncResourceObject == null) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                asyncResourceObject = Object(asyncResourceObject);
            }
            else {
                asyncResourceObject = {};
            }
            var resource = envObject.ensureHandleId(asyncResourceObject);
            var asyncResourceName = emnapiCtx.handleStore.get(async_resource_name).value;
            if (typeof asyncResourceName === 'symbol') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            asyncResourceName = String(asyncResourceName);
            var resource_name = envObject.ensureHandleId(asyncResourceName);
            // tsfn create
            var sizeofTSFN = emnapiTSFN.offset.__size__;
            // eslint-disable-next-line prefer-const
            var tsfn = _malloc(sizeofTSFN);
            if (!tsfn)
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            new Uint8Array(wasmMemory.buffer).subarray(tsfn, tsfn + sizeofTSFN).fill(0);
            var resourceRef = emnapiCtx.createReference(envObject, resource, 1, 1 /* ReferenceOwnership.kUserland */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var resource_ = resourceRef.id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(tsfn + emnapiTSFN.offset.resource, resource_, true);
            if (!emnapiTSFN.initQueue(tsfn)) {
                _free(tsfn);
                resourceRef.dispose();
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            _emnapi_node_emit_async_init(resource, resource_name, -1, tsfn + emnapiTSFN.offset.async_id);
            HEAP_DATA_VIEW.setInt8(tsfn + emnapiTSFN.offset.is_some, 1, true);
            HEAP_DATA_VIEW.setUint32(tsfn + emnapiTSFN.offset.thread_count, initial_thread_count, true);
            HEAP_DATA_VIEW.setUint32(tsfn + emnapiTSFN.offset.context, context, true);
            HEAP_DATA_VIEW.setUint32(tsfn + emnapiTSFN.offset.max_queue_size, max_queue_size, true);
            HEAP_DATA_VIEW.setUint32(tsfn + emnapiTSFN.offset.ref, ref, true);
            HEAP_DATA_VIEW.setUint32(tsfn + emnapiTSFN.offset.env, env, true);
            HEAP_DATA_VIEW.setUint32(tsfn + emnapiTSFN.offset.finalize_data, thread_finalize_data, true);
            HEAP_DATA_VIEW.setUint32(tsfn + emnapiTSFN.offset.finalize_cb, thread_finalize_cb, true);
            HEAP_DATA_VIEW.setUint32(tsfn + emnapiTSFN.offset.call_js_cb, call_js_cb, true);
            emnapiCtx.addCleanupHook(envObject, emnapiTSFN.cleanup, tsfn);
            envObject.ref();
            emnapiCtx.increaseWaitingRequestCounter();
            HEAP_DATA_VIEW.setUint32(tsfn + emnapiTSFN.offset.async_ref, 1, true);
            HEAP_DATA_VIEW.setUint32(result, tsfn, true);
            return envObject.clearLastError();
        }
        /** @__sig ipp */
        function napi_get_threadsafe_function_context(func, result) {
            if (!func || !result) {
                abort();
                return 1 /* napi_status.napi_invalid_arg */;
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var context = emnapiTSFN.getContext(func);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, context, true);
            return 0 /* napi_status.napi_ok */;
        }
        /** @__sig ippi */
        function napi_call_threadsafe_function(func, data, mode) {
            if (!func) {
                abort();
                return 1 /* napi_status.napi_invalid_arg */;
            }
            return emnapiTSFN.push(func, data, mode);
        }
        /** @__sig ip */
        function napi_acquire_threadsafe_function(func) {
            if (!func) {
                abort();
                return 1 /* napi_status.napi_invalid_arg */;
            }
            var mutex = emnapiTSFN.getMutex(func);
            return mutex.execute(function () {
                if (emnapiTSFN.getState(func) === 0 /* State.kOpen */) {
                    emnapiTSFN.addThreadCount(func);
                    return 0 /* napi_status.napi_ok */;
                }
                return 16 /* napi_status.napi_closing */;
            });
        }
        /** @__sig ipi */
        function napi_release_threadsafe_function(func, mode) {
            if (!func) {
                abort();
                return 1 /* napi_status.napi_invalid_arg */;
            }
            var mutex = emnapiTSFN.getMutex(func);
            var cond = emnapiTSFN.getCond(func);
            var shouldDelete = false;
            var ret = mutex.execute(function () {
                if (emnapiTSFN.getThreadCount(func) === 0) {
                    return 1 /* napi_status.napi_invalid_arg */;
                }
                emnapiTSFN.subThreadCount(func);
                if (emnapiTSFN.getThreadCount(func) === 0 || mode === 1 /* napi_threadsafe_function_release_mode.napi_tsfn_abort */) {
                    if (emnapiTSFN.getState(func) === 0 /* State.kOpen */) {
                        if (mode === 1 /* napi_threadsafe_function_release_mode.napi_tsfn_abort */) {
                            emnapiTSFN.setState(func, 1 /* State.kClosing */);
                        }
                        if (emnapiTSFN.getState(func) === 1 /* State.kClosing */ && emnapiTSFN.getMaxQueueSize(func) > 0) {
                            cond.signal();
                        }
                        emnapiTSFN.send(func);
                    }
                }
                if (!(emnapiTSFN.getState(func) === 2 /* State.kClosed */ && emnapiTSFN.getThreadCount(func) === 0)) {
                    return 0 /* napi_status.napi_ok */;
                }
                shouldDelete = true;
                return 0 /* napi_status.napi_ok */;
            });
            if (shouldDelete) {
                emnapiTSFN.destroy(func);
            }
            return ret;
        }
        /** @__sig ipp */
        function napi_unref_threadsafe_function(env, func) {
            if (!func) {
                abort();
                return 1 /* napi_status.napi_invalid_arg */;
            }
            var asyncRefOffset = (func + emnapiTSFN.offset.async_ref) >> 2;
            var arr = new Uint32Array(wasmMemory.buffer);
            var currentValue = Atomics.load(arr, asyncRefOffset);
            if (currentValue > 0) {
                Atomics.store(arr, asyncRefOffset, currentValue - 1);
                if (currentValue === 1) {
                    emnapiCtx.decreaseWaitingRequestCounter();
                }
            }
            return 0 /* napi_status.napi_ok */;
        }
        /** @__sig ipp */
        function napi_ref_threadsafe_function(env, func) {
            if (!func) {
                abort();
                return 1 /* napi_status.napi_invalid_arg */;
            }
            var asyncRefOffset = (func + emnapiTSFN.offset.async_ref) >> 2;
            var arr = new Uint32Array(wasmMemory.buffer);
            var currentValue = Atomics.load(arr, asyncRefOffset);
            if (!currentValue) {
                emnapiCtx.increaseWaitingRequestCounter();
            }
            Atomics.store(arr, asyncRefOffset, currentValue + 1);
            return 0 /* napi_status.napi_ok */;
        }
        var emnapiAWMT = {
            pool: [],
            workerReady: null,
            globalAddress: 0,
            globalOffset: {
                idle_threads: 0,
                q: 1 * 4,
                next: 1 * 4,
                prev: 2 * 4,
                mutex: 3 * 4,
                cond: 4 * 4,
                exit_message: 5 * 4,
                end: 7 * 4
            },
            offset: {
                /* napi_ref */ resource: 0,
                /* double */ async_id: 8,
                /* double */ trigger_async_id: 16,
                /* napi_env */ env: 24,
                /* int32_t */ status: 1 * 4 + 24, // 0 for pending, 1 for cancelled, 2 for completed
                queue: 2 * 4 + 24,
                queue_next: 2 * 4 + 24,
                queue_prev: 3 * 4 + 24,
                /* void* */ data: 4 * 4 + 24,
                /* napi_async_execute_callback */ execute: 5 * 4 + 24,
                /* napi_async_complete_callback */ complete: 6 * 4 + 24,
                end: 7 * 4 + 24
            },
            init: function () {
                emnapiAWMT.pool = [];
                emnapiAWMT.workerReady = null;
                if (typeof PThread !== 'undefined') {
                    PThread.unusedWorkers.forEach(emnapiAWMT.addListener);
                    PThread.runningWorkers.forEach(emnapiAWMT.addListener);
                    var __original_getNewWorker_1 = PThread.getNewWorker;
                    PThread.getNewWorker = function () {
                        var r = __original_getNewWorker_1.apply(this, arguments);
                        emnapiAWMT.addListener(r);
                        return r;
                    };
                }
            },
            addListener: function (worker) {
                if (!worker)
                    return false;
                if (worker._emnapiAWMTListener)
                    return true;
                var handler = function (e) {
                    var data = ENVIRONMENT_IS_NODE ? e : e.data;
                    var __emnapi__ = data.__emnapi__;
                    if (__emnapi__) {
                        var type = __emnapi__.type;
                        var payload = __emnapi__.payload;
                        if (type === 'async-work-complete') {
                            emnapiAWMT.callComplete(payload.work, 0 /* napi_status.napi_ok */);
                        }
                    }
                };
                var dispose = function () {
                    if (ENVIRONMENT_IS_NODE) {
                        worker.off('message', handler);
                    }
                    else {
                        worker.removeEventListener('message', handler, false);
                    }
                    delete worker._emnapiAWMTListener;
                };
                worker._emnapiAWMTListener = { handler: handler, dispose: dispose };
                if (ENVIRONMENT_IS_NODE) {
                    worker.on('message', handler);
                }
                else {
                    worker.addEventListener('message', handler, false);
                }
                return true;
            },
            initGlobal: function () {
                if (!emnapiAWMT.globalAddress) {
                    emnapiAWMT.globalAddress = _malloc(emnapiAWMT.globalOffset.end);
                    // Ensure the shared state is zero-initialized before use so that
                    // idle_threads/mutex/cond and related fields start from a known state.
                    var size = emnapiAWMT.globalOffset.end;
                    var addr = emnapiAWMT.globalAddress;
                    new Uint8Array(wasmMemory.buffer, addr, size).fill(0);
                    emnapiAWMT.queueInit(emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.q);
                    emnapiAWMT.queueInit(emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.exit_message);
                }
            },
            terminateWorkers: function () {
                emnapiAWMT.pool.forEach(function (w) {
                    var _a, _b;
                    (_a = w._emnapiAWMTListener) === null || _a === void 0 ? void 0 : _a.dispose();
                    (_b = w._emnapiTSFNListener) === null || _b === void 0 ? void 0 : _b.dispose();
                    w.terminate();
                });
                emnapiAWMT.pool.length = 0;
            },
            initWorkers: function (n) {
                if (ENVIRONMENT_IS_PTHREAD) {
                    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                    return emnapiAWMT.workerReady || (emnapiAWMT.workerReady = Promise.resolve());
                }
                if (emnapiAWMT.workerReady)
                    return emnapiAWMT.workerReady;
                if (!('emnapi_async_worker_create' in wasmInstance.exports)) {
                    throw new TypeError('`emnapi_async_worker_create` is not exported, please try to add `--export=emnapi_async_worker_create` to linker flags');
                }
                var emnapi_async_worker_create = wasmInstance.exports.emnapi_async_worker_create;
                var args = [];
                emnapiAWMT.initGlobal();
                for (var i = 0; i < n; ++i) {
                    args.push(emnapi_async_worker_create(1, emnapiAWMT.globalAddress));
                }
                var promises = args.map(function (index) {
                    if (index === 0) {
                        return Promise.reject(new Error('Failed to create async worker'));
                    }
                    if (index > 0) {
                        var view = new DataView(wasmMemory.buffer);
                        var tidOffset = 20;
                        var tid = view.getInt32(index + tidOffset, true);
                        var worker = PThread.pthreads[tid];
                        return worker.whenLoaded;
                    }
                    else {
                        var worker = emnapiAWMT.pool[-index - 1];
                        return worker.whenLoaded;
                    }
                });
                emnapiAWMT.workerReady = Promise.all(promises);
                return emnapiAWMT.workerReady;
            },
            getResource: function (work) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                return HEAP_DATA_VIEW.getUint32(work + emnapiAWMT.offset.resource, true);
            },
            getExecute: function (work) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                return HEAP_DATA_VIEW.getUint32(work + emnapiAWMT.offset.execute, true);
            },
            getComplete: function (work) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                return HEAP_DATA_VIEW.getUint32(work + emnapiAWMT.offset.complete, true);
            },
            getEnv: function (work) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                return HEAP_DATA_VIEW.getUint32(work + emnapiAWMT.offset.env, true);
            },
            getData: function (work) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                return HEAP_DATA_VIEW.getUint32(work + emnapiAWMT.offset.data, true);
            },
            getMutex: function () {
                var index = emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.mutex;
                var mutex = {
                    lock: function () {
                        var isBrowserMain = typeof window !== 'undefined' && typeof document !== 'undefined' && !ENVIRONMENT_IS_NODE;
                        var i32a = new Int32Array(wasmMemory.buffer, index, 1);
                        if (isBrowserMain) {
                            while (true) {
                                var oldValue = Atomics.compareExchange(i32a, 0, 0, 10);
                                if (oldValue === 0) {
                                    return;
                                }
                            }
                        }
                        else {
                            while (true) {
                                var oldValue = Atomics.compareExchange(i32a, 0, 0, 10);
                                if (oldValue === 0) {
                                    return;
                                }
                                Atomics.wait(i32a, 0, 10);
                            }
                        }
                    },
                    unlock: function () {
                        var i32a = new Int32Array(wasmMemory.buffer, index, 1);
                        var oldValue = Atomics.compareExchange(i32a, 0, 10, 0);
                        if (oldValue !== 10) {
                            throw new Error('Tried to unlock while not holding the mutex');
                        }
                        Atomics.notify(i32a, 0, 1);
                    },
                    execute: function (fn) {
                        mutex.lock();
                        try {
                            return fn();
                        }
                        finally {
                            mutex.unlock();
                        }
                    }
                };
                return mutex;
            },
            getCond: function () {
                var index = emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.cond;
                var mutex = emnapiAWMT.getMutex();
                var cond = {
                    wait: function () {
                        var i32a = new Int32Array(wasmMemory.buffer, index, 1);
                        var value = Atomics.load(i32a, 0);
                        mutex.unlock();
                        Atomics.wait(i32a, 0, value);
                        mutex.lock();
                    },
                    signal: function () {
                        var i32a = new Int32Array(wasmMemory.buffer, index, 1);
                        Atomics.add(i32a, 0, 1);
                        Atomics.notify(i32a, 0, 1);
                    }
                };
                return cond;
            },
            queueInit: function (q) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(q, q, true);
                HEAP_DATA_VIEW.setUint32(q + 4, q, true);
            },
            queueInsertTail: function (h, q) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(q, h, true);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var tempValue = HEAP_DATA_VIEW.getUint32(h + 4, true);
                HEAP_DATA_VIEW.setUint32(q + 4, tempValue, true);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var qprev = HEAP_DATA_VIEW.getUint32(q + 4, true);
                HEAP_DATA_VIEW.setUint32(qprev, q, true);
                HEAP_DATA_VIEW.setUint32(h + 4, q, true);
            },
            queueRemove: function (q) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var qprev = HEAP_DATA_VIEW.getUint32(q + 4, true);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var qnext = HEAP_DATA_VIEW.getUint32(q, true);
                HEAP_DATA_VIEW.setUint32(qprev, qnext, true);
                HEAP_DATA_VIEW.setUint32(qnext + 4, qprev, true);
            },
            queueEmpty: function (q) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                // eslint-disable-next-line eqeqeq
                return q == HEAP_DATA_VIEW.getUint32(q, true);
            },
            scheduleWork: function (work) {
                var _a;
                if (!((_a = emnapiAWMT.workerReady) === null || _a === void 0 ? void 0 : _a.ready)) {
                    emnapiAWMT.initWorkers(_emnapi_async_work_pool_size()).then(function () {
                        emnapiAWMT.workerReady.ready = true;
                    }).catch(function (err) {
                        emnapiAWMT.workerReady = null;
                        throw err;
                    });
                }
                emnapiCtx.increaseWaitingRequestCounter();
                var statusBuffer = new Int32Array(wasmMemory.buffer, work + emnapiAWMT.offset.status, 1);
                Atomics.store(statusBuffer, 0, 0 /* AsyncWorkStatus.Pending */);
                var mutex = emnapiAWMT.getMutex();
                var cond = emnapiAWMT.getCond();
                mutex.lock();
                try {
                    emnapiAWMT.queueInsertTail(emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.q, work + emnapiAWMT.offset.queue);
                }
                catch (err) {
                    emnapiCtx.decreaseWaitingRequestCounter();
                    mutex.unlock();
                    throw err;
                }
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                if (HEAP_DATA_VIEW.getUint32(emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.idle_threads, true) > 0) {
                    cond.signal();
                }
                mutex.unlock();
            },
            cancelWork: function (work) {
                var cancelled = false;
                emnapiAWMT.getMutex().execute(function () {
                    var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                    cancelled = !emnapiAWMT.queueEmpty(work + emnapiAWMT.offset.queue) && HEAP_DATA_VIEW.getInt32(work + emnapiAWMT.offset.status, true) !== 2 /* AsyncWorkStatus.Completed */;
                    if (cancelled) {
                        emnapiAWMT.queueRemove(work + emnapiAWMT.offset.queue);
                    }
                });
                if (!cancelled) {
                    return 9 /* napi_status.napi_generic_failure */;
                }
                if (Atomics.compareExchange(new Int32Array(wasmMemory.buffer, work + emnapiAWMT.offset.status, 1), 0, 0 /* AsyncWorkStatus.Pending */, 1 /* AsyncWorkStatus.Cancelled */) !== 0 /* AsyncWorkStatus.Pending */) {
                    return 9 /* napi_status.napi_generic_failure */;
                }
                emnapiCtx.feature.setImmediate(function () {
                    emnapiAWMT.callComplete(work, 11 /* napi_status.napi_cancelled */);
                });
                return 0 /* napi_status.napi_ok */;
            },
            callComplete: function (work, status) {
                emnapiCtx.decreaseWaitingRequestCounter();
                var complete = emnapiAWMT.getComplete(work);
                var env = emnapiAWMT.getEnv(work);
                var data = emnapiAWMT.getData(work);
                var envObject = emnapiCtx.envStore.get(env);
                var scope = emnapiCtx.openScope(envObject);
                var callback = function () {
                    if (!complete)
                        return;
                    envObject.callbackIntoModule(true, function () {
                        (wasmTable.get(complete))(env, status, data);
                    });
                };
                try {
                    if (emnapiNodeBinding) {
                        var resource = emnapiAWMT.getResource(work);
                        var resource_value = emnapiCtx.refStore.get(resource).get();
                        var resourceObject = emnapiCtx.handleStore.get(resource_value).value;
                        var view = new DataView(wasmMemory.buffer);
                        var asyncId = view.getFloat64(work + emnapiAWMT.offset.async_id, true);
                        var triggerAsyncId = view.getFloat64(work + emnapiAWMT.offset.trigger_async_id, true);
                        emnapiNodeBinding.node.makeCallback(resourceObject, callback, [], {
                            asyncId: asyncId,
                            triggerAsyncId: triggerAsyncId
                        });
                    }
                    else {
                        callback();
                    }
                }
                finally {
                    emnapiCtx.closeScope(envObject, scope);
                }
            }
        };
        emnapiAWMT.init();
        /** @__sig ippppppp */
        var napi_create_async_work = singleThreadAsyncWork
            ? function (env, resource, resource_name, execute, complete, data, result) {
                if (!env)
                    return 1 /* napi_status.napi_invalid_arg */;
                // @ts-expect-error
                var envObject = emnapiCtx.envStore.get(env);
                envObject.checkGCAccess();
                if (!execute)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var resourceObject;
                if (resource) {
                    resourceObject = Object(emnapiCtx.handleStore.get(resource).value);
                }
                else {
                    resourceObject = {};
                }
                if (!resource_name)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var resourceName = String(emnapiCtx.handleStore.get(resource_name).value);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var id = emnapiAWST.create(env, resourceObject, resourceName, execute, complete, data);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, id, true);
                return envObject.clearLastError();
            }
            : function (env, resource, resource_name, execute, complete, data, result) {
                if (!env)
                    return 1 /* napi_status.napi_invalid_arg */;
                // @ts-expect-error
                var envObject = emnapiCtx.envStore.get(env);
                envObject.checkGCAccess();
                if (!execute)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var resourceObject;
                if (resource) {
                    resourceObject = Object(emnapiCtx.handleStore.get(resource).value);
                }
                else {
                    resourceObject = {};
                }
                if (!resource_name)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var sizeofAW = emnapiAWMT.offset.end;
                var aw = _malloc(sizeofAW);
                if (!aw)
                    return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
                new Uint8Array(wasmMemory.buffer).subarray(aw, aw + sizeofAW).fill(0);
                var s = envObject.ensureHandleId(resourceObject);
                var resourceRef = emnapiCtx.createReference(envObject, s, 1, 1 /* ReferenceOwnership.kUserland */);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var resource_ = resourceRef.id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(aw, resource_, true);
                _emnapi_node_emit_async_init(s, resource_name, -1, aw + emnapiAWMT.offset.async_id);
                HEAP_DATA_VIEW.setUint32(aw + emnapiAWMT.offset.env, env, true);
                HEAP_DATA_VIEW.setUint32(aw + emnapiAWMT.offset.execute, execute, true);
                HEAP_DATA_VIEW.setUint32(aw + emnapiAWMT.offset.complete, complete, true);
                HEAP_DATA_VIEW.setUint32(aw + emnapiAWMT.offset.data, data, true);
                emnapiAWMT.queueInit(aw + emnapiAWMT.offset.queue);
                HEAP_DATA_VIEW.setUint32(result, aw, true);
                return envObject.clearLastError();
            };
        /** @__sig ipp */
        var napi_delete_async_work = singleThreadAsyncWork
            ? function (env, work) {
                if (!env)
                    return 1 /* napi_status.napi_invalid_arg */;
                // @ts-expect-error
                var envObject = emnapiCtx.envStore.get(env);
                envObject.checkGCAccess();
                if (!work)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                emnapiAWST.remove(work);
                return envObject.clearLastError();
            }
            : function (env, work) {
                if (!env)
                    return 1 /* napi_status.napi_invalid_arg */;
                // @ts-expect-error
                var envObject = emnapiCtx.envStore.get(env);
                envObject.checkGCAccess();
                if (!work)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var resource = emnapiAWMT.getResource(work);
                emnapiCtx.refStore.get(resource).dispose();
                if (emnapiNodeBinding) {
                    var view = new DataView(wasmMemory.buffer);
                    var asyncId = view.getFloat64(work + emnapiAWMT.offset.async_id, true);
                    var triggerAsyncId = view.getFloat64(work + emnapiAWMT.offset.trigger_async_id, true);
                    _emnapi_node_emit_async_destroy(asyncId, triggerAsyncId);
                }
                _free(work);
                return envObject.clearLastError();
            };
        /** @__sig ipp */
        var napi_queue_async_work = singleThreadAsyncWork
            ? function (env, work) {
                if (!env)
                    return 1 /* napi_status.napi_invalid_arg */;
                var envObject = emnapiCtx.envStore.get(env);
                if (!work)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                emnapiAWST.queue(work);
                return envObject.clearLastError();
            }
            : function (env, work) {
                if (!env)
                    return 1 /* napi_status.napi_invalid_arg */;
                var envObject = emnapiCtx.envStore.get(env);
                if (!work)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                emnapiAWMT.scheduleWork(work);
                return envObject.clearLastError();
            };
        /** @__sig ipp */
        var napi_cancel_async_work = singleThreadAsyncWork
            ? function (env, work) {
                if (!env)
                    return 1 /* napi_status.napi_invalid_arg */;
                var envObject = emnapiCtx.envStore.get(env);
                if (!work)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var status = emnapiAWST.cancel(work);
                if (status === 0 /* napi_status.napi_ok */)
                    return envObject.clearLastError();
                return envObject.setLastError(status);
            }
            : function (env, work) {
                if (!env)
                    return 1 /* napi_status.napi_invalid_arg */;
                var envObject = emnapiCtx.envStore.get(env);
                if (!work)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var status = emnapiAWMT.cancelWork(work);
                if (status === 0 /* napi_status.napi_ok */)
                    return envObject.clearLastError();
                return envObject.setLastError(status);
            };
        /** @__sig pp */
        function _emnapi_async_worker(globalAddress) {
            emnapiAWMT.globalAddress = globalAddress;
            var mutex = emnapiAWMT.getMutex();
            var cond = emnapiAWMT.getCond();
            mutex.lock();
            var exitMessageAddr = globalAddress + emnapiAWMT.globalOffset.exit_message;
            var idleThreadsAddr = globalAddress + emnapiAWMT.globalOffset.idle_threads;
            var workerQueueAddr = globalAddress + emnapiAWMT.globalOffset.q;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            for (;;) {
                while (emnapiAWMT.queueEmpty(workerQueueAddr)) {
                    Atomics.add(new Int32Array(wasmMemory.buffer, idleThreadsAddr, 1), 0, 1);
                    cond.wait();
                    Atomics.sub(new Int32Array(wasmMemory.buffer, idleThreadsAddr, 1), 0, 1);
                }
                var q = HEAP_DATA_VIEW.getUint32(workerQueueAddr, true);
                if (q === exitMessageAddr) {
                    cond.signal();
                    mutex.unlock();
                    break;
                }
                var work = q - emnapiAWMT.offset.queue;
                emnapiAWMT.queueRemove(q);
                emnapiAWMT.queueInit(q);
                mutex.unlock();
                var statusBuffer = new Int32Array(wasmMemory.buffer, work + emnapiAWMT.offset.status, 1);
                if (Atomics.load(statusBuffer, 0) === 1 /* AsyncWorkStatus.Cancelled */) {
                    abort('unreachable');
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var execute = emnapiAWMT.getExecute(work);
                var env = emnapiAWMT.getEnv(work);
                var data = emnapiAWMT.getData(work);
                (wasmTable.get(execute))(env, data);
                Atomics.store(statusBuffer, 0, 2 /* AsyncWorkStatus.Completed */);
                var postMessage_1 = napiModule.postMessage;
                postMessage_1({
                    __emnapi__: {
                        type: 'async-work-complete',
                        payload: { work: work }
                    }
                });
                mutex.lock();
            }
            return 0;
        }
        /** @__sig ipp */
        function _emnapi_spawn_worker(f, globalAddress) {
            if (typeof onCreateWorker !== 'function') {
                throw new TypeError('`options.onCreateWorker` is not a function');
            }
            var promises = [];
            var args = [];
            if (!('emnapi_async_worker_create' in wasmInstance.exports)) {
                throw new TypeError('`emnapi_async_worker_create` is not exported, please try to add `--export=emnapi_async_worker_create` to linker flags');
            }
            args.push(wasmInstance.exports.emnapi_async_worker_create(0, 0));
            var handleError = function (e) {
                if ('message' in e && (e.message.indexOf('RuntimeError') !== -1 || e.message.indexOf('unreachable') !== -1)) {
                    emnapiAWMT.terminateWorkers();
                }
            };
            var ret;
            try {
                var worker_1 = onCreateWorker({ type: 'async-work', name: 'emnapi-async-worker' });
                var p = PThread.loadWasmModuleToWorker(worker_1);
                if (ENVIRONMENT_IS_NODE) {
                    worker_1.on('error', handleError);
                }
                else {
                    worker_1.addEventListener('error', handleError, false);
                }
                emnapiAWMT.addListener(worker_1);
                emnapiTSFN.addListener(worker_1);
                promises.push(p.then(function () {
                    if (typeof worker_1.unref === 'function') {
                        worker_1.unref();
                    }
                }));
                ret = emnapiAWMT.pool.push(worker_1) - 1;
                var arg = args[0];
                worker_1.threadBlockBase = arg;
                worker_1.postMessage({
                    __emnapi__: {
                        type: 'async-worker-init',
                        payload: { arg: arg, func: [f, globalAddress] }
                    }
                });
            }
            catch (err) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var arg = args[0];
                _free(arg);
                throw err;
            }
            return ret;
        }
        function initWorker(startArg, func) {
            if (napiModule.childThread) {
                if (typeof wasmInstance.exports.emnapi_async_worker_init !== 'function') {
                    throw new TypeError('`emnapi_async_worker_init` is not exported, please try to add `--export=emnapi_async_worker_init` to linker flags');
                }
                wasmInstance.exports.emnapi_async_worker_init(startArg);
                (wasmTable.get(func[0]))(func[1]);
            }
            else {
                throw new Error('startThread is only available in child threads');
            }
        }
        napiModule.initWorker = initWorker;
        var asyncWorkMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            _emnapi_async_worker: _emnapi_async_worker,
            _emnapi_spawn_worker: _emnapi_spawn_worker,
            napi_cancel_async_work: napi_cancel_async_work,
            napi_create_async_work: napi_create_async_work,
            napi_delete_async_work: napi_delete_async_work,
            napi_queue_async_work: napi_queue_async_work
        });
        /**
         * @__deps malloc
         * @__deps free
         * @__postset
         * ```
         * emnapiExternalMemory.init();
         * ```
         */
        var emnapiExternalMemory = {
            registry: typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(function (_pointer) { _free(_pointer); }) : undefined,
            table: new WeakMap(),
            wasmMemoryViewTable: new WeakMap(),
            init: function () {
                emnapiExternalMemory.registry = typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(function (_pointer) { _free(_pointer); }) : undefined;
                emnapiExternalMemory.table = new WeakMap();
                emnapiExternalMemory.wasmMemoryViewTable = new WeakMap();
            },
            isSharedArrayBuffer: function (value) {
                return ((typeof SharedArrayBuffer === 'function' && value instanceof SharedArrayBuffer) ||
                    (Object.prototype.toString.call(value) === '[object SharedArrayBuffer]'));
            },
            isDetachedArrayBuffer: function (arrayBuffer) {
                if (arrayBuffer.byteLength === 0) {
                    try {
                        // eslint-disable-next-line no-new
                        new Uint8Array(arrayBuffer);
                    }
                    catch (_) {
                        return true;
                    }
                }
                return false;
            },
            getArrayBufferPointer: function (arrayBuffer, shouldCopy) {
                var _a;
                var info = {
                    address: 0,
                    ownership: 0 /* ReferenceOwnership.kRuntime */,
                    runtimeAllocated: 0
                };
                if (arrayBuffer === wasmMemory.buffer) {
                    return info;
                }
                var isDetached = emnapiExternalMemory.isDetachedArrayBuffer(arrayBuffer);
                if (emnapiExternalMemory.table.has(arrayBuffer)) {
                    var cachedInfo = emnapiExternalMemory.table.get(arrayBuffer);
                    if (isDetached) {
                        cachedInfo.address = 0;
                        return cachedInfo;
                    }
                    if (shouldCopy && cachedInfo.ownership === 0 /* ReferenceOwnership.kRuntime */ && cachedInfo.runtimeAllocated === 1) {
                        new Uint8Array(wasmMemory.buffer).set(new Uint8Array(arrayBuffer), cachedInfo.address);
                    }
                    return cachedInfo;
                }
                if (isDetached || (arrayBuffer.byteLength === 0)) {
                    return info;
                }
                if (!shouldCopy) {
                    return info;
                }
                var pointer = _malloc(arrayBuffer.byteLength);
                if (!pointer)
                    throw new Error('Out of memory');
                new Uint8Array(wasmMemory.buffer).set(new Uint8Array(arrayBuffer), pointer);
                info.address = pointer;
                info.ownership = emnapiExternalMemory.registry ? 0 /* ReferenceOwnership.kRuntime */ : 1 /* ReferenceOwnership.kUserland */;
                info.runtimeAllocated = 1;
                emnapiExternalMemory.table.set(arrayBuffer, info);
                (_a = emnapiExternalMemory.registry) === null || _a === void 0 ? void 0 : _a.register(arrayBuffer, pointer);
                return info;
            },
            getOrUpdateMemoryView: function (view) {
                if (view.buffer === wasmMemory.buffer) {
                    if (!emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
                        emnapiExternalMemory.wasmMemoryViewTable.set(view, {
                            Ctor: view.constructor,
                            address: view.byteOffset,
                            length: view instanceof DataView ? view.byteLength : view.length,
                            ownership: 1 /* ReferenceOwnership.kUserland */,
                            runtimeAllocated: 0
                        });
                    }
                    return view;
                }
                var maybeOldWasmMemory = emnapiExternalMemory.isDetachedArrayBuffer(view.buffer) ||
                    ((typeof SharedArrayBuffer === 'function') && (view.buffer instanceof SharedArrayBuffer));
                if (maybeOldWasmMemory && emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
                    var info = emnapiExternalMemory.wasmMemoryViewTable.get(view);
                    var Ctor = info.Ctor;
                    var newView = void 0;
                    var Buffer_1 = emnapiCtx.feature.Buffer;
                    if (typeof Buffer_1 === 'function' && Ctor === Buffer_1) {
                        newView = Buffer_1.from(wasmMemory.buffer, info.address, info.length);
                    }
                    else {
                        newView = new Ctor(wasmMemory.buffer, info.address, info.length);
                    }
                    emnapiExternalMemory.wasmMemoryViewTable.set(newView, info);
                    return newView;
                }
                return view;
            },
            getViewPointer: function (view, shouldCopy) {
                view = emnapiExternalMemory.getOrUpdateMemoryView(view);
                if (view.buffer === wasmMemory.buffer) {
                    if (emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
                        var _a = emnapiExternalMemory.wasmMemoryViewTable.get(view), address_1 = _a.address, ownership_1 = _a.ownership, runtimeAllocated_1 = _a.runtimeAllocated;
                        return { address: address_1, ownership: ownership_1, runtimeAllocated: runtimeAllocated_1, view: view };
                    }
                    return { address: view.byteOffset, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0, view: view };
                }
                var _b = emnapiExternalMemory.getArrayBufferPointer(view.buffer, shouldCopy), address = _b.address, ownership = _b.ownership, runtimeAllocated = _b.runtimeAllocated;
                return { address: address === 0 ? 0 : (address + view.byteOffset), ownership: ownership, runtimeAllocated: runtimeAllocated, view: view };
            }
        };
        /* eslint-disable @typescript-eslint/indent */
        /**
         * @__postset
         * ```
         * emnapiString.init();
         * ```
         */
        var emnapiString = {
            utf8Decoder: undefined,
            utf16Decoder: undefined,
            init: function () {
                var fallbackDecoder = {
                    decode: function (bytes) {
                        var inputIndex = 0;
                        var pendingSize = Math.min(0x1000, bytes.length + 1);
                        var pending = new Uint16Array(pendingSize);
                        var chunks = [];
                        var pendingIndex = 0;
                        for (;;) {
                            var more = inputIndex < bytes.length;
                            if (!more || (pendingIndex >= pendingSize - 1)) {
                                var subarray = pending.subarray(0, pendingIndex);
                                var arraylike = subarray;
                                chunks.push(String.fromCharCode.apply(null, arraylike));
                                if (!more) {
                                    return chunks.join('');
                                }
                                bytes = bytes.subarray(inputIndex);
                                inputIndex = 0;
                                pendingIndex = 0;
                            }
                            var byte1 = bytes[inputIndex++];
                            if ((byte1 & 0x80) === 0) {
                                pending[pendingIndex++] = byte1;
                            }
                            else if ((byte1 & 0xe0) === 0xc0) {
                                var byte2 = bytes[inputIndex++] & 0x3f;
                                pending[pendingIndex++] = ((byte1 & 0x1f) << 6) | byte2;
                            }
                            else if ((byte1 & 0xf0) === 0xe0) {
                                var byte2 = bytes[inputIndex++] & 0x3f;
                                var byte3 = bytes[inputIndex++] & 0x3f;
                                pending[pendingIndex++] = ((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3;
                            }
                            else if ((byte1 & 0xf8) === 0xf0) {
                                var byte2 = bytes[inputIndex++] & 0x3f;
                                var byte3 = bytes[inputIndex++] & 0x3f;
                                var byte4 = bytes[inputIndex++] & 0x3f;
                                var codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
                                if (codepoint > 0xffff) {
                                    codepoint -= 0x10000;
                                    pending[pendingIndex++] = (codepoint >>> 10) & 0x3ff | 0xd800;
                                    codepoint = 0xdc00 | codepoint & 0x3ff;
                                }
                                pending[pendingIndex++] = codepoint;
                            }
                            else ;
                        }
                    }
                };
                var utf8Decoder;
                utf8Decoder = typeof TextDecoder === 'function' ? new TextDecoder() : fallbackDecoder;
                emnapiString.utf8Decoder = utf8Decoder;
                var fallbackDecoder2 = {
                    decode: function (input) {
                        var bytes = new Uint16Array(input.buffer, input.byteOffset, input.byteLength / 2);
                        if (bytes.length <= 0x1000) {
                            return String.fromCharCode.apply(null, bytes);
                        }
                        var chunks = [];
                        var i = 0;
                        var len = 0;
                        for (; i < bytes.length; i += len) {
                            len = Math.min(0x1000, bytes.length - i);
                            chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + len)));
                        }
                        return chunks.join('');
                    }
                };
                var utf16Decoder;
                utf16Decoder = typeof TextDecoder === 'function' ? new TextDecoder('utf-16le') : fallbackDecoder2;
                emnapiString.utf16Decoder = utf16Decoder;
            },
            lengthBytesUTF8: function (str) {
                var c;
                var len = 0;
                for (var i = 0; i < str.length; ++i) {
                    c = str.charCodeAt(i);
                    if (c <= 0x7F) {
                        len++;
                    }
                    else if (c <= 0x7FF) {
                        len += 2;
                    }
                    else if (c >= 0xD800 && c <= 0xDFFF) {
                        len += 4;
                        ++i;
                    }
                    else {
                        len += 3;
                    }
                }
                return len;
            },
            UTF8ToString: function (ptr, length) {
                if (!ptr || !length)
                    return '';
                ptr >>>= 0;
                var HEAPU8 = new Uint8Array(wasmMemory.buffer);
                var end = ptr;
                if (length === -1) {
                    for (; HEAPU8[end];)
                        ++end;
                }
                else {
                    end = ptr + (length >>> 0);
                }
                length = end - ptr;
                if (length <= 16) {
                    var idx = ptr;
                    var str = '';
                    while (idx < end) {
                        var u0 = HEAPU8[idx++];
                        if (!(u0 & 0x80)) {
                            str += String.fromCharCode(u0);
                            continue;
                        }
                        var u1 = HEAPU8[idx++] & 63;
                        if ((u0 & 0xE0) === 0xC0) {
                            str += String.fromCharCode(((u0 & 31) << 6) | u1);
                            continue;
                        }
                        var u2 = HEAPU8[idx++] & 63;
                        if ((u0 & 0xF0) === 0xE0) {
                            u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
                        }
                        else {
                            u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (HEAPU8[idx++] & 63);
                        }
                        if (u0 < 0x10000) {
                            str += String.fromCharCode(u0);
                        }
                        else {
                            var ch = u0 - 0x10000;
                            str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
                        }
                    }
                    return str;
                }
                return emnapiString.utf8Decoder.decode(((typeof SharedArrayBuffer === "function" && HEAPU8.buffer instanceof SharedArrayBuffer) || (Object.prototype.toString.call(HEAPU8.buffer) === "[object SharedArrayBuffer]")) ? HEAPU8.slice(ptr, end) : HEAPU8.subarray(ptr, end));
            },
            stringToUTF8: function (str, outPtr, maxBytesToWrite) {
                var HEAPU8 = new Uint8Array(wasmMemory.buffer);
                var outIdx = outPtr;
                outIdx >>>= 0;
                if (!(maxBytesToWrite > 0)) {
                    return 0;
                }
                var startIdx = outIdx;
                var endIdx = outIdx + maxBytesToWrite - 1;
                for (var i = 0; i < str.length; ++i) {
                    var u = str.charCodeAt(i);
                    if (u >= 0xD800 && u <= 0xDFFF) {
                        var u1 = str.charCodeAt(++i);
                        u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
                    }
                    if (u <= 0x7F) {
                        if (outIdx >= endIdx)
                            break;
                        HEAPU8[outIdx++] = u;
                    }
                    else if (u <= 0x7FF) {
                        if (outIdx + 1 >= endIdx)
                            break;
                        HEAPU8[outIdx++] = 0xC0 | (u >> 6);
                        HEAPU8[outIdx++] = 0x80 | (u & 63);
                    }
                    else if (u <= 0xFFFF) {
                        if (outIdx + 2 >= endIdx)
                            break;
                        HEAPU8[outIdx++] = 0xE0 | (u >> 12);
                        HEAPU8[outIdx++] = 0x80 | ((u >> 6) & 63);
                        HEAPU8[outIdx++] = 0x80 | (u & 63);
                    }
                    else {
                        if (outIdx + 3 >= endIdx)
                            break;
                        HEAPU8[outIdx++] = 0xF0 | (u >> 18);
                        HEAPU8[outIdx++] = 0x80 | ((u >> 12) & 63);
                        HEAPU8[outIdx++] = 0x80 | ((u >> 6) & 63);
                        HEAPU8[outIdx++] = 0x80 | (u & 63);
                    }
                }
                HEAPU8[outIdx] = 0;
                return outIdx - startIdx;
            },
            UTF16ToString: function (ptr, length) {
                if (!ptr || !length)
                    return '';
                ptr >>>= 0;
                var end = ptr;
                if (length === -1) {
                    var idx = end >> 1;
                    var HEAPU16 = new Uint16Array(wasmMemory.buffer);
                    while (HEAPU16[idx])
                        ++idx;
                    end = idx << 1;
                }
                else {
                    end = ptr + (length >>> 0) * 2;
                }
                length = end - ptr;
                if (length <= 32) {
                    return String.fromCharCode.apply(null, new Uint16Array(wasmMemory.buffer, ptr, length / 2));
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var HEAPU8 = new Uint8Array(wasmMemory.buffer);
                return emnapiString.utf16Decoder.decode(((typeof SharedArrayBuffer === "function" && HEAPU8.buffer instanceof SharedArrayBuffer) || (Object.prototype.toString.call(HEAPU8.buffer) === "[object SharedArrayBuffer]")) ? HEAPU8.slice(ptr, end) : HEAPU8.subarray(ptr, end));
            },
            stringToUTF16: function (str, outPtr, maxBytesToWrite) {
                if (maxBytesToWrite === undefined) {
                    maxBytesToWrite = 0x7FFFFFFF;
                }
                if (maxBytesToWrite < 2)
                    return 0;
                maxBytesToWrite -= 2;
                var startPtr = outPtr;
                var numCharsToWrite = (maxBytesToWrite < str.length * 2) ? (maxBytesToWrite / 2) : str.length;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                for (var i = 0; i < numCharsToWrite; ++i) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    var codeUnit = str.charCodeAt(i);
                    HEAP_DATA_VIEW.setInt16(outPtr, codeUnit, true);
                    outPtr += 2;
                }
                HEAP_DATA_VIEW.setInt16(outPtr, 0, true);
                return outPtr - startPtr;
            },
            newString: function (env, str, length, result, stringMaker) {
                if (!env)
                    return 1 /* napi_status.napi_invalid_arg */;
                // @ts-expect-error
                var envObject = emnapiCtx.envStore.get(env);
                envObject.checkGCAccess();
                var autoLength = length === -1;
                var sizelength = length >>> 0;
                if (length !== 0) {
                    if (!str)
                        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!(autoLength || (sizelength <= 2147483647)))
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var strValue = stringMaker(str, autoLength, sizelength);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var value = emnapiCtx.addToCurrentScope(strValue).id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.clearLastError();
            },
            newExternalString: function (env, str, length, finalize_callback, finalize_hint, result, copied, createApi, stringMaker) {
                if (!env)
                    return 1 /* napi_status.napi_invalid_arg */;
                // @ts-expect-error
                var envObject = emnapiCtx.envStore.get(env);
                envObject.checkGCAccess();
                var autoLength = length === -1;
                var sizelength = length >>> 0;
                if (length !== 0) {
                    if (!str)
                        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!(autoLength || (sizelength <= 2147483647)))
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var status = createApi(env, str, length, result);
                if (status === 0 /* napi_status.napi_ok */) {
                    if (copied) {
                        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                        HEAP_DATA_VIEW.setInt8(copied, 1, true);
                    }
                    if (finalize_callback) {
                        envObject.callFinalizer(finalize_callback, str, finalize_hint);
                    }
                }
                return status;
            }
        };
        /**
         * @__sig ippp
         */
        function napi_get_array_length(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!value)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var handle = emnapiCtx.handleStore.get(value);
                if (!handle.isArray()) {
                    return envObject.setLastError(8 /* napi_status.napi_array_expected */);
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var v = handle.value.length >>> 0;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, v, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ipppp
         */
        function napi_get_arraybuffer_info(env, arraybuffer, data, byte_length) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!arraybuffer)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(arraybuffer);
            if (!handle.isArrayBuffer() && !emnapiExternalMemory.isSharedArrayBuffer(handle.value)) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            if (data) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var p = emnapiExternalMemory.getArrayBufferPointer(handle.value, true).address;
                HEAP_DATA_VIEW.setUint32(data, p, true);
            }
            if (byte_length) {
                HEAP_DATA_VIEW.setUint32(byte_length, handle.value.byteLength, true);
            }
            return envObject.clearLastError();
        }
        /**
         * @__sig ippp
         */
        function node_api_set_prototype(env, object, value) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!value)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var obj = emnapiCtx.handleStore.get(object).value;
                if (obj == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var type = typeof obj;
                var v = void 0;
                try {
                    v = (type === 'object' && obj !== null) || type === 'function' ? obj : Object(obj);
                }
                catch (_) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                var val = emnapiCtx.handleStore.get(value).value;
                Object.setPrototypeOf(v, val);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ippp
         */
        function napi_get_prototype(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!value)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var handle = emnapiCtx.handleStore.get(value);
                if (handle.value == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var v = void 0;
                try {
                    v = handle.isObject() || handle.isFunction() ? handle.value : Object(handle.value);
                }
                catch (_) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var p = envObject.ensureHandleId(Object.getPrototypeOf(v));
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, p, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ippppppp
         */
        function napi_get_typedarray_info(env, typedarray, type, length, data, arraybuffer, byte_offset) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!typedarray)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(typedarray);
            if (!handle.isTypedArray()) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            var v = handle.value;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            if (type) {
                var t = void 0;
                if (v instanceof Int8Array) {
                    t = 0 /* napi_typedarray_type.napi_int8_array */;
                }
                else if (v instanceof Uint8Array) {
                    t = 1 /* napi_typedarray_type.napi_uint8_array */;
                }
                else if (v instanceof Uint8ClampedArray) {
                    t = 2 /* napi_typedarray_type.napi_uint8_clamped_array */;
                }
                else if (v instanceof Int16Array) {
                    t = 3 /* napi_typedarray_type.napi_int16_array */;
                }
                else if (v instanceof Uint16Array) {
                    t = 4 /* napi_typedarray_type.napi_uint16_array */;
                }
                else if (v instanceof Int32Array) {
                    t = 5 /* napi_typedarray_type.napi_int32_array */;
                }
                else if (v instanceof Uint32Array) {
                    t = 6 /* napi_typedarray_type.napi_uint32_array */;
                }
                else if (typeof Float16Array === 'function' && v instanceof Float16Array) {
                    t = 11 /* napi_typedarray_type.napi_float16_array */;
                }
                else if (v instanceof Float32Array) {
                    t = 7 /* napi_typedarray_type.napi_float32_array */;
                }
                else if (v instanceof Float64Array) {
                    t = 8 /* napi_typedarray_type.napi_float64_array */;
                }
                else if (v instanceof BigInt64Array) {
                    t = 9 /* napi_typedarray_type.napi_bigint64_array */;
                }
                else if (v instanceof BigUint64Array) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    t = 10 /* napi_typedarray_type.napi_biguint64_array */;
                }
                else {
                    return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
                }
                HEAP_DATA_VIEW.setInt32(type, t, true);
            }
            if (length) {
                HEAP_DATA_VIEW.setUint32(length, v.length, true);
            }
            var buffer;
            if (data || arraybuffer) {
                buffer = v.buffer;
                if (data) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    var p = emnapiExternalMemory.getViewPointer(v, true).address;
                    HEAP_DATA_VIEW.setUint32(data, p, true);
                }
                if (arraybuffer) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    var ab = envObject.ensureHandleId(buffer);
                    HEAP_DATA_VIEW.setUint32(arraybuffer, ab, true);
                }
            }
            if (byte_offset) {
                HEAP_DATA_VIEW.setUint32(byte_offset, v.byteOffset, true);
            }
            return envObject.clearLastError();
        }
        /**
         * @__sig ipppp
         */
        function napi_get_buffer_info(env, buffer, data, length) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!buffer)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(buffer);
            if (!handle.isBuffer(emnapiCtx.feature.Buffer))
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (handle.isDataView()) {
                return napi_get_dataview_info(env, buffer, length, data, 0, 0);
            }
            return napi_get_typedarray_info(env, buffer, 0, length, data, 0, 0);
        }
        /**
         * @__sig ipppppp
         */
        function napi_get_dataview_info(env, dataview, byte_length, data, arraybuffer, byte_offset) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!dataview)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(dataview);
            if (!handle.isDataView()) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            var v = handle.value;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            if (byte_length) {
                HEAP_DATA_VIEW.setUint32(byte_length, v.byteLength, true);
            }
            var buffer;
            if (data || arraybuffer) {
                buffer = v.buffer;
                if (data) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    var p = emnapiExternalMemory.getViewPointer(v, true).address;
                    HEAP_DATA_VIEW.setUint32(data, p, true);
                }
                if (arraybuffer) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    var ab = envObject.ensureHandleId(buffer);
                    HEAP_DATA_VIEW.setUint32(arraybuffer, ab, true);
                }
            }
            if (byte_offset) {
                HEAP_DATA_VIEW.setUint32(byte_offset, v.byteOffset, true);
            }
            return envObject.clearLastError();
        }
        /**
         * @__sig ippp
         */
        function napi_get_date_value(env, value, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!value)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var handle = emnapiCtx.handleStore.get(value);
                if (!handle.isDate()) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                v = handle.value.valueOf();
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setFloat64(result, v, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ippp
         */
        function napi_get_value_bool(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(value);
            if (typeof handle.value !== 'boolean') {
                return envObject.setLastError(7 /* napi_status.napi_boolean_expected */);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r = handle.value ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt8(result, r, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ippp
         */
        function napi_get_value_double(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(value);
            if (typeof handle.value !== 'number') {
                return envObject.setLastError(6 /* napi_status.napi_number_expected */);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r = handle.value;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setFloat64(result, r, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ipppp
         */
        function napi_get_value_bigint_int64(env, value, result, lossless) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!emnapiCtx.feature.supportBigInt) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!lossless)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(value);
            var numberValue = handle.value;
            if (typeof numberValue !== 'bigint') {
                return envObject.setLastError(6 /* napi_status.napi_number_expected */);
            }
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            if ((numberValue >= (BigInt(-1) * (BigInt(1) << BigInt(63)))) && (numberValue < (BigInt(1) << BigInt(63)))) {
                HEAP_DATA_VIEW.setInt8(lossless, 1, true);
            }
            else {
                HEAP_DATA_VIEW.setInt8(lossless, 0, true);
                numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1));
                if (numberValue >= (BigInt(1) << BigInt(63))) {
                    numberValue = numberValue - (BigInt(1) << BigInt(64));
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var low = Number(numberValue & BigInt(0xffffffff));
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var high = Number(numberValue >> BigInt(32));
            HEAP_DATA_VIEW.setInt32(result, low, true);
            HEAP_DATA_VIEW.setInt32(result + 4, high, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ipppp
         */
        function napi_get_value_bigint_uint64(env, value, result, lossless) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!emnapiCtx.feature.supportBigInt) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!lossless)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(value);
            var numberValue = handle.value;
            if (typeof numberValue !== 'bigint') {
                return envObject.setLastError(6 /* napi_status.napi_number_expected */);
            }
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            if ((numberValue >= BigInt(0)) && (numberValue < (BigInt(1) << BigInt(64)))) {
                HEAP_DATA_VIEW.setInt8(lossless, 1, true);
            }
            else {
                HEAP_DATA_VIEW.setInt8(lossless, 0, true);
                numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1));
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var low = Number(numberValue & BigInt(0xffffffff));
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var high = Number(numberValue >> BigInt(32));
            HEAP_DATA_VIEW.setUint32(result, low, true);
            HEAP_DATA_VIEW.setUint32(result + 4, high, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ippppp
         */
        function napi_get_value_bigint_words(env, value, sign_bit, word_count, words) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!emnapiCtx.feature.supportBigInt) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!word_count)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(value);
            if (!handle.isBigInt()) {
                return envObject.setLastError(17 /* napi_status.napi_bigint_expected */);
            }
            var isMinus = handle.value < BigInt(0);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            var word_count_int = HEAP_DATA_VIEW.getUint32(word_count, true);
            var wordCount = 0;
            var bigintValue = isMinus ? (handle.value * BigInt(-1)) : handle.value;
            while (bigintValue !== BigInt(0)) {
                wordCount++;
                bigintValue = bigintValue >> BigInt(64);
            }
            bigintValue = isMinus ? (handle.value * BigInt(-1)) : handle.value;
            if (!sign_bit && !words) {
                word_count_int = wordCount;
                HEAP_DATA_VIEW.setUint32(word_count, word_count_int, true);
            }
            else {
                if (!sign_bit)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!words)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var wordsArr = [];
                while (bigintValue !== BigInt(0)) {
                    var uint64 = bigintValue & ((BigInt(1) << BigInt(64)) - BigInt(1));
                    wordsArr.push(uint64);
                    bigintValue = bigintValue >> BigInt(64);
                }
                var len = Math.min(word_count_int, wordsArr.length);
                for (var i = 0; i < len; i++) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    var low = Number(wordsArr[i] & BigInt(0xffffffff));
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    var high = Number(wordsArr[i] >> BigInt(32));
                    HEAP_DATA_VIEW.setUint32(words + i * 8, low, true);
                    HEAP_DATA_VIEW.setUint32(words + (i * 8 + 4), high, true);
                }
                HEAP_DATA_VIEW.setInt32(sign_bit, isMinus ? 1 : 0, true);
                HEAP_DATA_VIEW.setUint32(word_count, len, true);
            }
            return envObject.clearLastError();
        }
        /**
         * @__sig ippp
         */
        function napi_get_value_external(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(value);
            if (!handle.isExternal()) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var p = handle.data();
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, p, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ippp
         */
        function napi_get_value_int32(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(value);
            if (typeof handle.value !== 'number') {
                return envObject.setLastError(6 /* napi_status.napi_number_expected */);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v = new Int32Array([handle.value])[0];
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt32(result, v, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ippp
         */
        function napi_get_value_int64(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(value);
            if (typeof handle.value !== 'number') {
                return envObject.setLastError(6 /* napi_status.napi_number_expected */);
            }
            var numberValue = handle.value;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            if (numberValue === Number.POSITIVE_INFINITY || numberValue === Number.NEGATIVE_INFINITY || isNaN(numberValue)) {
                HEAP_DATA_VIEW.setInt32(result, 0, true);
                HEAP_DATA_VIEW.setInt32(result + 4, 0, true);
            }
            else if (numberValue < /* INT64_RANGE_NEGATIVE */ -9223372036854776e3) {
                HEAP_DATA_VIEW.setInt32(result, 0, true);
                HEAP_DATA_VIEW.setInt32(result + 4, 2147483648, true);
            }
            else if (numberValue >= /* INT64_RANGE_POSITIVE */ 9223372036854776000) {
                HEAP_DATA_VIEW.setUint32(result, 4294967295, true);
                HEAP_DATA_VIEW.setUint32(result + 4, 2147483647, true);
            }
            else {
                $emnapiSetValueI64(result, Math.trunc(numberValue));
            }
            return envObject.clearLastError();
        }
        /**
         * @__sig ippppp
         */
        function napi_get_value_string_latin1(env, value, buf, buf_size, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            buf_size = buf_size >>> 0;
            var handle = emnapiCtx.handleStore.get(value);
            if (typeof handle.value !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            if (!buf) {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                HEAP_DATA_VIEW.setUint32(result, handle.value.length, true);
            }
            else if (buf_size !== 0) {
                var copied = 0;
                var v = void 0;
                for (var i = 0; i < buf_size - 1; ++i) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    v = handle.value.charCodeAt(i) & 0xff;
                    HEAP_DATA_VIEW.setUint8(buf + i, v, true);
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    copied++;
                }
                HEAP_DATA_VIEW.setUint8(buf + copied, 0, true);
                if (result) {
                    HEAP_DATA_VIEW.setUint32(result, copied, true);
                }
            }
            else if (result) {
                HEAP_DATA_VIEW.setUint32(result, 0, true);
            }
            return envObject.clearLastError();
        }
        /**
         * @__sig ippppp
         */
        function napi_get_value_string_utf8(env, value, buf, buf_size, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            buf_size = buf_size >>> 0;
            var handle = emnapiCtx.handleStore.get(value);
            if (typeof handle.value !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            if (!buf) {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var strLength = emnapiString.lengthBytesUTF8(handle.value);
                HEAP_DATA_VIEW.setUint32(result, strLength, true);
            }
            else if (buf_size !== 0) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var copied = emnapiString.stringToUTF8(handle.value, buf, buf_size);
                if (result) {
                    HEAP_DATA_VIEW.setUint32(result, copied, true);
                }
            }
            else if (result) {
                HEAP_DATA_VIEW.setUint32(result, 0, true);
            }
            return envObject.clearLastError();
        }
        /**
         * @__sig ippppp
         */
        function napi_get_value_string_utf16(env, value, buf, buf_size, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            buf_size = buf_size >>> 0;
            var handle = emnapiCtx.handleStore.get(value);
            if (typeof handle.value !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            if (!buf) {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                HEAP_DATA_VIEW.setUint32(result, handle.value.length, true);
            }
            else if (buf_size !== 0) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var copied = emnapiString.stringToUTF16(handle.value, buf, buf_size * 2);
                if (result) {
                    HEAP_DATA_VIEW.setUint32(result, copied / 2, true);
                }
            }
            else if (result) {
                HEAP_DATA_VIEW.setUint32(result, 0, true);
            }
            return envObject.clearLastError();
        }
        /**
         * @__sig ippp
         */
        function napi_get_value_uint32(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(value);
            if (typeof handle.value !== 'number') {
                return envObject.setLastError(6 /* napi_status.napi_number_expected */);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v = new Uint32Array([handle.value])[0];
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, v, true);
            return envObject.clearLastError();
        }
        var convert2cMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            napi_get_array_length: napi_get_array_length,
            napi_get_arraybuffer_info: napi_get_arraybuffer_info,
            napi_get_buffer_info: napi_get_buffer_info,
            napi_get_dataview_info: napi_get_dataview_info,
            napi_get_date_value: napi_get_date_value,
            napi_get_prototype: napi_get_prototype,
            napi_get_typedarray_info: napi_get_typedarray_info,
            napi_get_value_bigint_int64: napi_get_value_bigint_int64,
            napi_get_value_bigint_uint64: napi_get_value_bigint_uint64,
            napi_get_value_bigint_words: napi_get_value_bigint_words,
            napi_get_value_bool: napi_get_value_bool,
            napi_get_value_double: napi_get_value_double,
            napi_get_value_external: napi_get_value_external,
            napi_get_value_int32: napi_get_value_int32,
            napi_get_value_int64: napi_get_value_int64,
            napi_get_value_string_latin1: napi_get_value_string_latin1,
            napi_get_value_string_utf16: napi_get_value_string_utf16,
            napi_get_value_string_utf8: napi_get_value_string_utf8,
            napi_get_value_uint32: napi_get_value_uint32,
            node_api_set_prototype: node_api_set_prototype
        });
        /**
         * @__sig ipip
         */
        function napi_create_int32(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v = emnapiCtx.addToCurrentScope(value).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, v, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ipip
         */
        function napi_create_uint32(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v = emnapiCtx.addToCurrentScope(value >>> 0).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, v, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ipjp
         */
        function napi_create_int64(env, low, high, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            var value;
            if (!high)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            value = Number(low);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v1 = emnapiCtx.addToCurrentScope(value).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(high, v1, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ipdp
         */
        function napi_create_double(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v = emnapiCtx.addToCurrentScope(value).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, v, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ipppp
         */
        function napi_create_string_latin1(env, str, length, result) {
            return emnapiString.newString(env, str, length, result, function (str, autoLength, sizeLength) {
                var latin1String = '';
                var len = 0;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                if (autoLength) {
                    while (true) {
                        var ch = HEAP_DATA_VIEW.getUint8(str, true);
                        if (!ch)
                            break;
                        latin1String += String.fromCharCode(ch);
                        str++;
                    }
                }
                else {
                    while (len < sizeLength) {
                        var ch = HEAP_DATA_VIEW.getUint8(str, true);
                        if (!ch)
                            break;
                        latin1String += String.fromCharCode(ch);
                        len++;
                        str++;
                    }
                }
                return latin1String;
            });
        }
        /**
         * @__sig ipppp
         */
        function napi_create_string_utf16(env, str, length, result) {
            return emnapiString.newString(env, str, length, result, function (str) {
                return emnapiString.UTF16ToString(str, length);
            });
        }
        /**
         * @__sig ipppp
         */
        function napi_create_string_utf8(env, str, length, result) {
            return emnapiString.newString(env, str, length, result, function (str) {
                return emnapiString.UTF8ToString(str, length);
            });
        }
        /**
         * @__sig ippppppp
         */
        function node_api_create_external_string_latin1(env, str, length, finalize_callback, finalize_hint, result, copied) {
            return emnapiString.newExternalString(env, str, length, finalize_callback, finalize_hint, result, copied, napi_create_string_latin1, undefined);
        }
        /**
         * @__sig ippppppp
         */
        function node_api_create_external_string_utf16(env, str, length, finalize_callback, finalize_hint, result, copied) {
            return emnapiString.newExternalString(env, str, length, finalize_callback, finalize_hint, result, copied, napi_create_string_utf16, undefined);
        }
        /**
         * @__sig ipppp
         */
        function node_api_create_property_key_latin1(env, str, length, result) {
            return napi_create_string_latin1(env, str, length, result);
        }
        /**
         * @__sig ipppp
         */
        function node_api_create_property_key_utf8(env, str, length, result) {
            return napi_create_string_utf8(env, str, length, result);
        }
        /**
         * @__sig ipppp
         */
        function node_api_create_property_key_utf16(env, str, length, result) {
            return napi_create_string_utf16(env, str, length, result);
        }
        /**
         * @__sig ipjp
         */
        function napi_create_bigint_int64(env, low, high, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!emnapiCtx.feature.supportBigInt) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            var value;
            if (!high)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            value = low;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v1 = emnapiCtx.addToCurrentScope(value).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(high, v1, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ipjp
         */
        function napi_create_bigint_uint64(env, low, high, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!emnapiCtx.feature.supportBigInt) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            var value;
            if (!high)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            value = low & ((BigInt(1) << BigInt(64)) - BigInt(1));
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v1 = emnapiCtx.addToCurrentScope(value).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(high, v1, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ipippp
         */
        function napi_create_bigint_words(env, sign_bit, word_count, words, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v, i;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!emnapiCtx.feature.supportBigInt) {
                    return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
                }
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                word_count = word_count >>> 0;
                if (word_count > 2147483647) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                if (word_count > (1024 * 1024 / (4 * 8) / 2)) {
                    throw new RangeError('Maximum BigInt size exceeded');
                }
                var value = BigInt(0);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                for (i = 0; i < word_count; i++) {
                    var low = HEAP_DATA_VIEW.getUint32(words + i * 8, true);
                    var high = HEAP_DATA_VIEW.getUint32(words + (i * 8 + 4), true);
                    var wordi = BigInt(low) | (BigInt(high) << BigInt(32));
                    value += wordi << BigInt(64 * i);
                }
                value *= ((BigInt(sign_bit) % BigInt(2) === BigInt(0)) ? BigInt(1) : BigInt(-1));
                v = emnapiCtx.addToCurrentScope(value).id;
                HEAP_DATA_VIEW.setUint32(result, v, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        var convert2napiMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            napi_create_bigint_int64: napi_create_bigint_int64,
            napi_create_bigint_uint64: napi_create_bigint_uint64,
            napi_create_bigint_words: napi_create_bigint_words,
            napi_create_double: napi_create_double,
            napi_create_int32: napi_create_int32,
            napi_create_int64: napi_create_int64,
            napi_create_string_latin1: napi_create_string_latin1,
            napi_create_string_utf16: napi_create_string_utf16,
            napi_create_string_utf8: napi_create_string_utf8,
            napi_create_uint32: napi_create_uint32,
            node_api_create_external_string_latin1: node_api_create_external_string_latin1,
            node_api_create_external_string_utf16: node_api_create_external_string_utf16,
            node_api_create_property_key_latin1: node_api_create_property_key_latin1,
            node_api_create_property_key_utf16: node_api_create_property_key_utf16,
            node_api_create_property_key_utf8: node_api_create_property_key_utf8
        });
        function emnapiCreateFunction(envObject, utf8name, length, cb, data) {
            var functionName = (!utf8name || !length) ? '' : (emnapiString.UTF8ToString(utf8name, length));
            var f;
            var napiCallback = (wasmTable.get(cb));
            var callback = function (envObject) {
                return napiCallback(envObject.id, envObject.ctx.scopeStore.currentScope.id);
            };
            var makeFunction = function (envObject, callback) {
                return function () {
                    var scope = envObject.ctx.openScope(envObject);
                    var callbackInfo = scope.callbackInfo;
                    callbackInfo.data = data;
                    callbackInfo.args = arguments;
                    callbackInfo.thiz = this;
                    callbackInfo.fn = f;
                    try {
                        var napiValue = envObject.callIntoModule(callback);
                        return (!napiValue) ? undefined : envObject.ctx.handleStore.get(napiValue).value;
                    }
                    finally {
                        callbackInfo.data = 0;
                        callbackInfo.args = undefined;
                        callbackInfo.thiz = undefined;
                        callbackInfo.fn = undefined;
                        envObject.ctx.closeScope(envObject, scope);
                    }
                };
            };
            if (functionName === '') {
                f = makeFunction(envObject, callback);
                return { status: 0 /* napi_status.napi_ok */, f: f };
            }
            if (!(/^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(functionName))) {
                return { status: 1 /* napi_status.napi_invalid_arg */, f: undefined };
            }
            if (emnapiCtx.feature.supportNewFunction) {
                var _ = makeFunction(envObject, callback);
                try {
                    f = (new Function('_', 'return function ' + functionName + '(){' +
                        '"use strict";' +
                        'return _.apply(this,arguments);' +
                        '};'))(_);
                }
                catch (_err) {
                    f = makeFunction(envObject, callback);
                    if (emnapiCtx.feature.canSetFunctionName)
                        Object.defineProperty(f, 'name', { value: functionName });
                }
            }
            else {
                f = makeFunction(envObject, callback);
                if (emnapiCtx.feature.canSetFunctionName)
                    Object.defineProperty(f, 'name', { value: functionName });
            }
            return { status: 0 /* napi_status.napi_ok */, f: f };
        }
        function emnapiDefineProperty(envObject, obj, propertyName, method, getter, setter, value, attributes, data) {
            if (getter || setter) {
                var localGetter = void 0;
                var localSetter = void 0;
                if (getter) {
                    localGetter = emnapiCreateFunction(envObject, 0, 0, getter, data).f;
                }
                if (setter) {
                    localSetter = emnapiCreateFunction(envObject, 0, 0, setter, data).f;
                }
                var desc = {
                    configurable: (attributes & 4 /* napi_property_attributes.napi_configurable */) !== 0,
                    enumerable: (attributes & 2 /* napi_property_attributes.napi_enumerable */) !== 0,
                    get: localGetter,
                    set: localSetter
                };
                Object.defineProperty(obj, propertyName, desc);
            }
            else if (method) {
                var localMethod = emnapiCreateFunction(envObject, 0, 0, method, data).f;
                var desc = {
                    configurable: (attributes & 4 /* napi_property_attributes.napi_configurable */) !== 0,
                    enumerable: (attributes & 2 /* napi_property_attributes.napi_enumerable */) !== 0,
                    writable: (attributes & 1 /* napi_property_attributes.napi_writable */) !== 0,
                    value: localMethod
                };
                Object.defineProperty(obj, propertyName, desc);
            }
            else {
                var desc = {
                    configurable: (attributes & 4 /* napi_property_attributes.napi_configurable */) !== 0,
                    enumerable: (attributes & 2 /* napi_property_attributes.napi_enumerable */) !== 0,
                    writable: (attributes & 1 /* napi_property_attributes.napi_writable */) !== 0,
                    value: emnapiCtx.handleStore.get(value).value
                };
                Object.defineProperty(obj, propertyName, desc);
            }
        }
        function emnapiGetHandle(js_object) {
            var handle = emnapiCtx.handleStore.get(js_object);
            if (!(handle.isObject() || handle.isFunction())) {
                return { status: 1 /* napi_status.napi_invalid_arg */ };
            }
            if (typeof emnapiExternalMemory !== 'undefined' && ArrayBuffer.isView(handle.value)) {
                if (emnapiExternalMemory.wasmMemoryViewTable.has(handle.value)) {
                    handle = emnapiCtx.addToCurrentScope(emnapiExternalMemory.wasmMemoryViewTable.get(handle.value));
                }
            }
            return { status: 0 /* napi_status.napi_ok */, handle: handle };
        }
        function emnapiWrap(env, js_object, native_object, finalize_cb, finalize_hint, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var referenceId;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!emnapiCtx.feature.supportFinalizer) {
                    if (finalize_cb) {
                        throw emnapiCtx.createNotSupportWeakRefError('napi_wrap', 'Parameter "finalize_cb" must be 0(NULL)');
                    }
                    if (result) {
                        throw emnapiCtx.createNotSupportWeakRefError('napi_wrap', 'Parameter "result" must be 0(NULL)');
                    }
                }
                if (!js_object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var handleResult = emnapiGetHandle(js_object);
                if (handleResult.status !== 0 /* napi_status.napi_ok */) {
                    return envObject.setLastError(handleResult.status);
                }
                var handle = handleResult.handle;
                if (envObject.getObjectBinding(handle.value).wrapped !== 0) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var reference = void 0;
                if (result) {
                    if (!finalize_cb)
                        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                    reference = emnapiCtx.createReferenceWithFinalizer(envObject, handle.id, 0, 1 /* ReferenceOwnership.kUserland */, finalize_cb, native_object, finalize_hint);
                    referenceId = reference.id;
                    var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                    HEAP_DATA_VIEW.setUint32(result, referenceId, true);
                }
                else {
                    if (finalize_cb) {
                        reference = emnapiCtx.createReferenceWithFinalizer(envObject, handle.id, 0, 0 /* ReferenceOwnership.kRuntime */, finalize_cb, native_object, finalize_hint);
                    }
                    else {
                        reference = emnapiCtx.createReferenceWithData(envObject, handle.id, 0, 0 /* ReferenceOwnership.kRuntime */, native_object);
                    }
                }
                envObject.getObjectBinding(handle.value).wrapped = reference.id;
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        function emnapiUnwrap(env, js_object, result, action) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var data;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!js_object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (action === 0 /* UnwrapAction.KeepWrap */) {
                    if (!result)
                        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var value = emnapiCtx.handleStore.get(js_object);
                if (!(value.isObject() || value.isFunction())) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var binding = envObject.getObjectBinding(value.value);
                var referenceId = binding.wrapped;
                var ref = emnapiCtx.refStore.get(referenceId);
                if (!ref)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (result) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    data = ref.data();
                    var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                    HEAP_DATA_VIEW.setUint32(result, data, true);
                }
                if (action === 1 /* UnwrapAction.RemoveWrap */) {
                    binding.wrapped = 0;
                    if (ref.ownership() === 1 /* ReferenceOwnership.kUserland */) {
                        // When the wrap is been removed, the finalizer should be reset.
                        ref.resetFinalizer();
                    }
                    else {
                        ref.dispose();
                    }
                }
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ipppppppp
         */
        function napi_define_class(env, utf8name, length, constructor, callback_data, property_count, properties, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var propPtr, valueHandleId, attributes;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!constructor)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                property_count = property_count >>> 0;
                if (property_count > 0) {
                    if (!properties)
                        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                if ((length < -1) || (length > 2147483647) || (!utf8name)) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var fresult = emnapiCreateFunction(envObject, utf8name, length, constructor, callback_data);
                if (fresult.status !== 0 /* napi_status.napi_ok */)
                    return envObject.setLastError(fresult.status);
                var F = fresult.f;
                var propertyName = void 0;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                for (var i = 0; i < property_count; i++) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    propPtr = properties + (i * (4 * 8));
                    var utf8Name = HEAP_DATA_VIEW.getUint32(propPtr, true);
                    var name_1 = HEAP_DATA_VIEW.getUint32(propPtr + 4, true);
                    var method = HEAP_DATA_VIEW.getUint32(propPtr + 8, true);
                    var getter = HEAP_DATA_VIEW.getUint32(propPtr + 12, true);
                    var setter = HEAP_DATA_VIEW.getUint32(propPtr + 16, true);
                    var value = HEAP_DATA_VIEW.getUint32(propPtr + 20, true);
                    attributes = HEAP_DATA_VIEW.getInt32(propPtr + 24, true);
                    var data = HEAP_DATA_VIEW.getUint32(propPtr + 28, true);
                    if (utf8Name) {
                        propertyName = emnapiString.UTF8ToString(utf8Name, -1);
                    }
                    else {
                        if (!name_1) {
                            return envObject.setLastError(4 /* napi_status.napi_name_expected */);
                        }
                        propertyName = emnapiCtx.handleStore.get(name_1).value;
                        if (typeof propertyName !== 'string' && typeof propertyName !== 'symbol') {
                            return envObject.setLastError(4 /* napi_status.napi_name_expected */);
                        }
                    }
                    if ((attributes & 1024 /* napi_property_attributes.napi_static */) !== 0) {
                        emnapiDefineProperty(envObject, F, propertyName, method, getter, setter, value, attributes, data);
                        continue;
                    }
                    emnapiDefineProperty(envObject, F.prototype, propertyName, method, getter, setter, value, attributes, data);
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var valueHandle = emnapiCtx.addToCurrentScope(F);
                valueHandleId = valueHandle.id;
                HEAP_DATA_VIEW.setUint32(result, valueHandleId, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ipppppp
         */
        function napi_wrap(env, js_object, native_object, finalize_cb, finalize_hint, result) {
            return emnapiWrap(env, js_object, native_object, finalize_cb, finalize_hint, result);
        }
        /**
         * @__sig ippp
         */
        function napi_unwrap(env, js_object, result) {
            return emnapiUnwrap(env, js_object, result, 0 /* UnwrapAction.KeepWrap */);
        }
        /**
         * @__sig ippp
         */
        function napi_remove_wrap(env, js_object, result) {
            return emnapiUnwrap(env, js_object, result, 1 /* UnwrapAction.RemoveWrap */);
        }
        /**
         * @__sig ippp
         */
        function napi_type_tag_object(env, object, type_tag) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!object) {
                    return envObject.setLastError(envObject.tryCatch.hasCaught() ? 10 /* napi_status.napi_pending_exception */ : 1 /* napi_status.napi_invalid_arg */);
                }
                var value = emnapiCtx.handleStore.get(object);
                if (!(value.isObject() || value.isFunction())) {
                    return envObject.setLastError(envObject.tryCatch.hasCaught() ? 10 /* napi_status.napi_pending_exception */ : 2 /* napi_status.napi_object_expected */);
                }
                if (!type_tag) {
                    return envObject.setLastError(envObject.tryCatch.hasCaught() ? 10 /* napi_status.napi_pending_exception */ : 1 /* napi_status.napi_invalid_arg */);
                }
                var binding = envObject.getObjectBinding(value.value);
                if (binding.tag !== null) {
                    return envObject.setLastError(envObject.tryCatch.hasCaught() ? 10 /* napi_status.napi_pending_exception */ : 1 /* napi_status.napi_invalid_arg */);
                }
                var tag = new Uint8Array(16);
                tag.set(new Uint8Array(wasmMemory.buffer, type_tag, 16));
                binding.tag = new Uint32Array(tag.buffer);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ipppp
         */
        function napi_check_object_type_tag(env, object, type_tag, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, one-var
            var ret = true;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!object) {
                    return envObject.setLastError(envObject.tryCatch.hasCaught() ? 10 /* napi_status.napi_pending_exception */ : 1 /* napi_status.napi_invalid_arg */);
                }
                var value = emnapiCtx.handleStore.get(object);
                if (!(value.isObject() || value.isFunction())) {
                    return envObject.setLastError(envObject.tryCatch.hasCaught() ? 10 /* napi_status.napi_pending_exception */ : 2 /* napi_status.napi_object_expected */);
                }
                if (!type_tag) {
                    return envObject.setLastError(envObject.tryCatch.hasCaught() ? 10 /* napi_status.napi_pending_exception */ : 1 /* napi_status.napi_invalid_arg */);
                }
                if (!result) {
                    return envObject.setLastError(envObject.tryCatch.hasCaught() ? 10 /* napi_status.napi_pending_exception */ : 1 /* napi_status.napi_invalid_arg */);
                }
                var binding = envObject.getObjectBinding(value.value);
                if (binding.tag !== null) {
                    var tag = binding.tag;
                    var typeTag = new Uint32Array(wasmMemory.buffer, type_tag, 4);
                    ret = (tag[0] === typeTag[0] &&
                        tag[1] === typeTag[1] &&
                        tag[2] === typeTag[2] &&
                        tag[3] === typeTag[3]);
                }
                else {
                    ret = false;
                }
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setInt8(result, ret ? 1 : 0, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ipppppp
         */
        function napi_add_finalizer(env, js_object, finalize_data, finalize_cb, finalize_hint, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!emnapiCtx.feature.supportFinalizer) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            if (!js_object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!finalize_cb)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handleResult = emnapiGetHandle(js_object);
            if (handleResult.status !== 0 /* napi_status.napi_ok */) {
                return envObject.setLastError(handleResult.status);
            }
            var handle = handleResult.handle;
            var ownership = !result ? 0 /* ReferenceOwnership.kRuntime */ : 1 /* ReferenceOwnership.kUserland */;
            var reference = emnapiCtx.createReferenceWithFinalizer(envObject, handle.id, 0, ownership, finalize_cb, finalize_data, finalize_hint);
            if (result) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var referenceId = reference.id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, referenceId, true);
            }
            return envObject.clearLastError();
        }
        /**
         * @__sig ipppp
         */
        function node_api_post_finalizer(env, finalize_cb, finalize_data, finalize_hint) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            var envObject = emnapiCtx.envStore.get(env);
            envObject.enqueueFinalizer(emnapiCtx.createTrackedFinalizer(envObject, finalize_cb, finalize_data, finalize_hint));
            return envObject.clearLastError();
        }
        var wrapMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            napi_add_finalizer: napi_add_finalizer,
            napi_check_object_type_tag: napi_check_object_type_tag,
            napi_define_class: napi_define_class,
            napi_remove_wrap: napi_remove_wrap,
            napi_type_tag_object: napi_type_tag_object,
            napi_unwrap: napi_unwrap,
            napi_wrap: napi_wrap,
            node_api_post_finalizer: node_api_post_finalizer
        });
        /**
         * @__sig ipippppp
         */
        function emnapi_create_memory_view(env, typedarray_type, external_data, byte_length, finalize_cb, finalize_hint, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                byte_length = byte_length >>> 0;
                if (!external_data) {
                    byte_length = 0;
                }
                if (byte_length > 2147483647) {
                    throw new RangeError('Cannot create a memory view larger than 2147483647 bytes');
                }
                if ((external_data + byte_length) > wasmMemory.buffer.byteLength) {
                    throw new RangeError('Memory out of range');
                }
                if (!emnapiCtx.feature.supportFinalizer && finalize_cb) {
                    throw emnapiCtx.createNotSupportWeakRefError('emnapi_create_memory_view', 'Parameter "finalize_cb" must be 0(NULL)');
                }
                var viewDescriptor = void 0;
                switch (typedarray_type) {
                    case 0 /* emnapi_memory_view_type.emnapi_int8_array */:
                        viewDescriptor = { Ctor: Int8Array, address: external_data, length: byte_length, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case 1 /* emnapi_memory_view_type.emnapi_uint8_array */:
                        viewDescriptor = { Ctor: Uint8Array, address: external_data, length: byte_length, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case 2 /* emnapi_memory_view_type.emnapi_uint8_clamped_array */:
                        viewDescriptor = { Ctor: Uint8ClampedArray, address: external_data, length: byte_length, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case 3 /* emnapi_memory_view_type.emnapi_int16_array */:
                        viewDescriptor = { Ctor: Int16Array, address: external_data, length: byte_length >> 1, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case 4 /* emnapi_memory_view_type.emnapi_uint16_array */:
                        viewDescriptor = { Ctor: Uint16Array, address: external_data, length: byte_length >> 1, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case 5 /* emnapi_memory_view_type.emnapi_int32_array */:
                        viewDescriptor = { Ctor: Int32Array, address: external_data, length: byte_length >> 2, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case 6 /* emnapi_memory_view_type.emnapi_uint32_array */:
                        viewDescriptor = { Ctor: Uint32Array, address: external_data, length: byte_length >> 2, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case 7 /* emnapi_memory_view_type.emnapi_float32_array */:
                        viewDescriptor = { Ctor: Float32Array, address: external_data, length: byte_length >> 2, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case 8 /* emnapi_memory_view_type.emnapi_float64_array */:
                        viewDescriptor = { Ctor: Float64Array, address: external_data, length: byte_length >> 3, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case 9 /* emnapi_memory_view_type.emnapi_bigint64_array */:
                        viewDescriptor = { Ctor: BigInt64Array, address: external_data, length: byte_length >> 3, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case 10 /* emnapi_memory_view_type.emnapi_biguint64_array */:
                        viewDescriptor = { Ctor: BigUint64Array, address: external_data, length: byte_length >> 3, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case -1 /* emnapi_memory_view_type.emnapi_data_view */:
                        viewDescriptor = { Ctor: DataView, address: external_data, length: byte_length, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case 11 /* emnapi_memory_view_type.emnapi_float16_array */:
                        if (typeof Float16Array !== 'function') {
                            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                        }
                        viewDescriptor = { Ctor: Float16Array, address: external_data, length: byte_length >> 1, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    case -2 /* emnapi_memory_view_type.emnapi_buffer */: {
                        if (!emnapiCtx.feature.Buffer) {
                            throw emnapiCtx.createNotSupportBufferError('emnapi_create_memory_view', '');
                        }
                        viewDescriptor = { Ctor: emnapiCtx.feature.Buffer, address: external_data, length: byte_length, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                        break;
                    }
                    default: return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var Ctor = viewDescriptor.Ctor;
                var typedArray = typedarray_type === -2 /* emnapi_memory_view_type.emnapi_buffer */
                    ? emnapiCtx.feature.Buffer.from(wasmMemory.buffer, viewDescriptor.address, viewDescriptor.length)
                    : new Ctor(wasmMemory.buffer, viewDescriptor.address, viewDescriptor.length);
                var handle = emnapiCtx.addToCurrentScope(typedArray);
                emnapiExternalMemory.wasmMemoryViewTable.set(typedArray, viewDescriptor);
                if (finalize_cb) {
                    var status_1 = napi_add_finalizer(env, handle.id, external_data, finalize_cb, finalize_hint, /* NULL */ 0);
                    if (status_1 === 10 /* napi_status.napi_pending_exception */) {
                        var err = envObject.tryCatch.extractException();
                        envObject.clearLastError();
                        throw err;
                    }
                    else if (status_1 !== 0 /* napi_status.napi_ok */) {
                        return envObject.setLastError(status_1);
                    }
                }
                value = handle.id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig i
         */
        function emnapi_is_support_weakref() {
            return emnapiCtx.feature.supportFinalizer ? 1 : 0;
        }
        /**
         * @__sig i
         */
        function emnapi_is_support_bigint() {
            return emnapiCtx.feature.supportBigInt ? 1 : 0;
        }
        /**
         * @__sig i
         */
        function emnapi_is_node_binding_available() {
            return emnapiNodeBinding ? 1 : 0;
        }
        function $emnapiSyncMemory(js_to_wasm, arrayBufferOrView, offset, len) {
            offset = offset !== null && offset !== void 0 ? offset : 0;
            offset = offset >>> 0;
            var view;
            if (arrayBufferOrView instanceof ArrayBuffer || emnapiExternalMemory.isSharedArrayBuffer(arrayBufferOrView)) {
                var pointer = emnapiExternalMemory.getArrayBufferPointer(arrayBufferOrView, false).address;
                if (!pointer)
                    throw new Error('Unknown ArrayBuffer address');
                if (typeof len !== 'number' || len === -1) {
                    len = arrayBufferOrView.byteLength - offset;
                }
                len = len >>> 0;
                if (len === 0)
                    return arrayBufferOrView;
                view = new Uint8Array(arrayBufferOrView, offset, len);
                var wasmMemoryU8 = new Uint8Array(wasmMemory.buffer);
                if (!js_to_wasm) {
                    view.set(wasmMemoryU8.subarray(pointer, pointer + len));
                }
                else {
                    wasmMemoryU8.set(view, pointer);
                }
                return arrayBufferOrView;
            }
            if (ArrayBuffer.isView(arrayBufferOrView)) {
                var viewPointerInfo = emnapiExternalMemory.getViewPointer(arrayBufferOrView, false);
                var latestView = viewPointerInfo.view;
                var pointer = viewPointerInfo.address;
                if (!pointer)
                    throw new Error('Unknown ArrayBuffer address');
                if (typeof len !== 'number' || len === -1) {
                    len = latestView.byteLength - offset;
                }
                len = len >>> 0;
                if (len === 0)
                    return latestView;
                view = new Uint8Array(latestView.buffer, latestView.byteOffset + offset, len);
                var wasmMemoryU8 = new Uint8Array(wasmMemory.buffer);
                if (!js_to_wasm) {
                    view.set(wasmMemoryU8.subarray(pointer, pointer + len));
                }
                else {
                    wasmMemoryU8.set(view, pointer);
                }
                return latestView;
            }
            throw new TypeError('emnapiSyncMemory expect ArrayBuffer or ArrayBufferView as first parameter');
        }
        /**
         * @__sig ipippp
         */
        function emnapi_sync_memory(env, js_to_wasm, arraybuffer_or_view, offset, len) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!arraybuffer_or_view)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                var handleId = HEAP_DATA_VIEW.getUint32(arraybuffer_or_view, true);
                var handle = envObject.ctx.handleStore.get(handleId);
                if (!handle.isArrayBuffer() && !handle.isTypedArray() && !handle.isDataView() && !emnapiExternalMemory.isSharedArrayBuffer(handle.value)) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var ret = $emnapiSyncMemory(Boolean(js_to_wasm), handle.value, offset, len);
                if (handle.value !== ret) {
                    v = envObject.ensureHandleId(ret);
                    HEAP_DATA_VIEW.setUint32(arraybuffer_or_view, v, true);
                }
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        function $emnapiGetMemoryAddress(arrayBufferOrView) {
            var isArrayBuffer = arrayBufferOrView instanceof ArrayBuffer;
            var isDataView = arrayBufferOrView instanceof DataView;
            var isTypedArray = ArrayBuffer.isView(arrayBufferOrView) && !isDataView;
            if (!isArrayBuffer && !isTypedArray && !isDataView && !emnapiExternalMemory.isSharedArrayBuffer(arrayBufferOrView)) {
                throw new TypeError('emnapiGetMemoryAddress expect ArrayBuffer or ArrayBufferView as first parameter');
            }
            var info;
            if (isArrayBuffer) {
                info = emnapiExternalMemory.getArrayBufferPointer(arrayBufferOrView, false);
            }
            else {
                info = emnapiExternalMemory.getViewPointer(arrayBufferOrView, false);
            }
            return {
                address: info.address,
                ownership: info.ownership,
                runtimeAllocated: info.runtimeAllocated
            };
        }
        /**
         * @__sig ipppp
         */
        function emnapi_get_memory_address(env, arraybuffer_or_view, address, ownership, runtime_allocated) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var p, runtimeAllocated, ownershipOut;
            var info;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!arraybuffer_or_view)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!address && !ownership && !runtime_allocated) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var handle = envObject.ctx.handleStore.get(arraybuffer_or_view);
                info = $emnapiGetMemoryAddress(handle.value);
                p = info.address;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                if (address) {
                    HEAP_DATA_VIEW.setUint32(address, p, true);
                }
                if (ownership) {
                    ownershipOut = info.ownership;
                    HEAP_DATA_VIEW.setInt32(ownership, ownershipOut, true);
                }
                if (runtime_allocated) {
                    runtimeAllocated = info.runtimeAllocated;
                    HEAP_DATA_VIEW.setInt8(runtime_allocated, runtimeAllocated, true);
                }
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ipp
         */
        function emnapi_get_runtime_version(env, version) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            var envObject = emnapiCtx.envStore.get(env);
            if (!version)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var runtimeVersion;
            try {
                runtimeVersion = emnapiCtx.getRuntimeVersions().version;
            }
            catch (_) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var versions = runtimeVersion.split('.')
                .map(function (n) { return Number(n); });
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(version, versions[0], true);
            HEAP_DATA_VIEW.setUint32(version + 4, versions[1], true);
            HEAP_DATA_VIEW.setUint32(version + 8, versions[2], true);
            return envObject.clearLastError();
        }
        var emnapiMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            $emnapiGetMemoryAddress: $emnapiGetMemoryAddress,
            $emnapiSyncMemory: $emnapiSyncMemory,
            emnapi_create_memory_view: emnapi_create_memory_view,
            emnapi_get_memory_address: emnapi_get_memory_address,
            emnapi_get_runtime_version: emnapi_get_runtime_version,
            emnapi_is_node_binding_available: emnapi_is_node_binding_available,
            emnapi_is_support_bigint: emnapi_is_support_bigint,
            emnapi_is_support_weakref: emnapi_is_support_weakref,
            emnapi_sync_memory: emnapi_sync_memory
        });
        /**
         * @__sig ipp
         */
        function napi_create_array(env, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = emnapiCtx.addToCurrentScope([]).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ippp
         */
        function napi_create_array_with_length(env, length, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            length = length >>> 0;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = emnapiCtx.addToCurrentScope(new Array(length)).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        function emnapiCreateArrayBuffer(byte_length, data, shared) {
            byte_length = byte_length >>> 0;
            var arrayBuffer = shared ? new SharedArrayBuffer(byte_length) : new ArrayBuffer(byte_length);
            if (data) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var p = emnapiExternalMemory.getArrayBufferPointer(arrayBuffer, true).address;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(data, p, true);
            }
            return arrayBuffer;
        }
        /**
         * @__sig ipppp
         */
        function napi_create_arraybuffer(env, byte_length, data, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var arrayBuffer = emnapiCreateArrayBuffer(byte_length, data, false);
                value = emnapiCtx.addToCurrentScope(arrayBuffer).id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ipppp
         */
        function node_api_create_sharedarraybuffer(env, byte_length, data, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var arrayBuffer = emnapiCreateArrayBuffer(byte_length, data, true);
                value = emnapiCtx.addToCurrentScope(arrayBuffer).id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ipdp
         */
        function napi_create_date(env, time, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                value = emnapiCtx.addToCurrentScope(new Date(time)).id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ippppp
         */
        function napi_create_external(env, data, finalize_cb, finalize_hint, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!emnapiCtx.feature.supportFinalizer && finalize_cb) {
                    throw emnapiCtx.createNotSupportWeakRefError('napi_create_external', 'Parameter "finalize_cb" must be 0(NULL)');
                }
                var externalHandle = emnapiCtx.getCurrentScope().addExternal(data);
                if (finalize_cb) {
                    emnapiCtx.createReferenceWithFinalizer(envObject, externalHandle.id, 0, 0 /* ReferenceOwnership.kRuntime */, finalize_cb, data, finalize_hint);
                }
                value = externalHandle.id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.clearLastError();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ipppppp
         */
        function napi_create_external_arraybuffer(env, external_data, byte_length, finalize_cb, finalize_hint, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                byte_length = byte_length >>> 0;
                if (!external_data) {
                    byte_length = 0;
                }
                if ((external_data + byte_length) > wasmMemory.buffer.byteLength) {
                    throw new RangeError('Memory out of range');
                }
                if (!emnapiCtx.feature.supportFinalizer && finalize_cb) {
                    throw emnapiCtx.createNotSupportWeakRefError('napi_create_external_arraybuffer', 'Parameter "finalize_cb" must be 0(NULL)');
                }
                var arrayBuffer = new ArrayBuffer(byte_length);
                if (byte_length === 0) {
                    try {
                        var MessageChannel_1 = emnapiCtx.feature.MessageChannel;
                        var messageChannel = new MessageChannel_1();
                        messageChannel.port1.postMessage(arrayBuffer, [arrayBuffer]);
                    }
                    catch (_) { }
                }
                else {
                    var u8arr = new Uint8Array(arrayBuffer);
                    u8arr.set(new Uint8Array(wasmMemory.buffer).subarray(external_data, external_data + byte_length));
                    emnapiExternalMemory.table.set(arrayBuffer, {
                        address: external_data,
                        ownership: 1 /* ReferenceOwnership.kUserland */,
                        runtimeAllocated: 0
                    });
                }
                var handle = emnapiCtx.addToCurrentScope(arrayBuffer);
                if (finalize_cb) {
                    var status_1 = napi_add_finalizer(env, handle.id, external_data, finalize_cb, finalize_hint, /* NULL */ 0);
                    if (status_1 === 10 /* napi_status.napi_pending_exception */) {
                        var err = envObject.tryCatch.extractException();
                        envObject.clearLastError();
                        throw err;
                    }
                    else if (status_1 !== 0 /* napi_status.napi_ok */) {
                        return envObject.setLastError(status_1);
                    }
                }
                value = handle.id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ipp
         */
        function napi_create_object(env, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = emnapiCtx.addToCurrentScope({}).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ipppppp
         */
        function node_api_create_object_with_properties(env, prototype_or_null, property_names, property_values, property_count, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            property_count = property_count >>> 0;
            if (property_count > 0) {
                if (!property_names)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!property_values)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            var v8_prototype_or_null = prototype_or_null
                ? emnapiCtx.handleStore.get(prototype_or_null).value
                : null;
            var properties = {};
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            for (var i = 0; i < property_count; i++) {
                var name_value = emnapiCtx.handleStore.get(HEAP_DATA_VIEW.getUint32(property_names + i * 4, true)).value;
                if (!(typeof name_value === "string" || typeof name_value === "symbol"))
                    return envObject.setLastError(4 /* napi_status.napi_name_expected */);
                properties[name_value] = {
                    value: emnapiCtx.handleStore.get(HEAP_DATA_VIEW.getUint32(property_values + i * 4, true)).value,
                    writable: true,
                    enumerable: true,
                    configurable: true
                };
            }
            var obj;
            try {
                obj = Object.defineProperties(Object.create(v8_prototype_or_null), properties);
            }
            catch (_) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = emnapiCtx.addToCurrentScope(obj).id;
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        /**
         * @__sig ippp
         */
        function napi_create_symbol(env, description, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            if (!description) {
                // eslint-disable-next-line symbol-description, @typescript-eslint/no-unused-vars
                var value = emnapiCtx.addToCurrentScope(Symbol()).id;
                HEAP_DATA_VIEW.setUint32(result, value, true);
            }
            else {
                var handle = emnapiCtx.handleStore.get(description);
                var desc = handle.value;
                if (typeof desc !== 'string') {
                    return envObject.setLastError(3 /* napi_status.napi_string_expected */);
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var v = emnapiCtx.addToCurrentScope(Symbol(desc)).id;
                HEAP_DATA_VIEW.setUint32(result, v, true);
            }
            return envObject.clearLastError();
        }
        /**
         * @__sig ipipppp
         */
        function napi_create_typedarray(env, type, length, arraybuffer, byte_offset, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!arraybuffer)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var handle = emnapiCtx.handleStore.get(arraybuffer);
                if (!handle.isArrayBuffer()) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var buffer = handle.value;
                var createTypedArray = function (envObject, Type, size_of_element, buffer, byte_offset, length) {
                    var _a;
                    byte_offset = byte_offset >>> 0;
                    length = length >>> 0;
                    if (size_of_element > 1) {
                        if ((byte_offset) % (size_of_element) !== 0) {
                            var err = new RangeError("start offset of ".concat((_a = Type.name) !== null && _a !== void 0 ? _a : '', " should be a multiple of ").concat(size_of_element));
                            err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT';
                            envObject.tryCatch.setError(err);
                            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
                        }
                    }
                    if (((length * size_of_element) + byte_offset) > buffer.byteLength) {
                        var err = new RangeError('Invalid typed array length');
                        err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_LENGTH';
                        envObject.tryCatch.setError(err);
                        return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
                    }
                    var out = new Type(buffer, byte_offset, length);
                    if (buffer === wasmMemory.buffer) {
                        if (!emnapiExternalMemory.wasmMemoryViewTable.has(out)) {
                            emnapiExternalMemory.wasmMemoryViewTable.set(out, {
                                Ctor: Type,
                                address: byte_offset,
                                length: length,
                                ownership: 1 /* ReferenceOwnership.kUserland */,
                                runtimeAllocated: 0
                            });
                        }
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    value = emnapiCtx.addToCurrentScope(out).id;
                    var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                    HEAP_DATA_VIEW.setUint32(result, value, true);
                    return envObject.getReturnStatus();
                };
                switch (type) {
                    case 0 /* napi_typedarray_type.napi_int8_array */:
                        return createTypedArray(envObject, Int8Array, 1, buffer, byte_offset, length);
                    case 1 /* napi_typedarray_type.napi_uint8_array */:
                        return createTypedArray(envObject, Uint8Array, 1, buffer, byte_offset, length);
                    case 2 /* napi_typedarray_type.napi_uint8_clamped_array */:
                        return createTypedArray(envObject, Uint8ClampedArray, 1, buffer, byte_offset, length);
                    case 3 /* napi_typedarray_type.napi_int16_array */:
                        return createTypedArray(envObject, Int16Array, 2, buffer, byte_offset, length);
                    case 4 /* napi_typedarray_type.napi_uint16_array */:
                        return createTypedArray(envObject, Uint16Array, 2, buffer, byte_offset, length);
                    case 5 /* napi_typedarray_type.napi_int32_array */:
                        return createTypedArray(envObject, Int32Array, 4, buffer, byte_offset, length);
                    case 6 /* napi_typedarray_type.napi_uint32_array */:
                        return createTypedArray(envObject, Uint32Array, 4, buffer, byte_offset, length);
                    case 7 /* napi_typedarray_type.napi_float32_array */:
                        return createTypedArray(envObject, Float32Array, 4, buffer, byte_offset, length);
                    case 8 /* napi_typedarray_type.napi_float64_array */:
                        return createTypedArray(envObject, Float64Array, 8, buffer, byte_offset, length);
                    case 9 /* napi_typedarray_type.napi_bigint64_array */:
                        return createTypedArray(envObject, BigInt64Array, 8, buffer, byte_offset, length);
                    case 10 /* napi_typedarray_type.napi_biguint64_array */:
                        return createTypedArray(envObject, BigUint64Array, 8, buffer, byte_offset, length);
                    case 11 /* napi_typedarray_type.napi_float16_array */:
                        if (typeof Float16Array !== 'function') {
                            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                        }
                        return createTypedArray(envObject, Float16Array, 2, buffer, byte_offset, length);
                    default:
                        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__deps malloc
         * @__sig ippp
         */
        function napi_create_buffer(env, size, data, result) {
            var _a;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value, pointer;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var Buffer = emnapiCtx.feature.Buffer;
                if (!Buffer) {
                    throw emnapiCtx.createNotSupportBufferError('napi_create_buffer', '');
                }
                var buffer = void 0;
                size = size >>> 0;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                if (!data || (size === 0)) {
                    buffer = Buffer.alloc(size);
                    value = emnapiCtx.addToCurrentScope(buffer).id;
                    HEAP_DATA_VIEW.setUint32(result, value, true);
                }
                else {
                    pointer = _malloc(size);
                    if (!pointer)
                        throw new Error('Out of memory');
                    new Uint8Array(wasmMemory.buffer).subarray(pointer, pointer + size).fill(0);
                    var buffer_1 = Buffer.from(wasmMemory.buffer, pointer, size);
                    var viewDescriptor = {
                        Ctor: Buffer,
                        address: pointer,
                        length: size,
                        ownership: emnapiExternalMemory.registry ? 0 /* ReferenceOwnership.kRuntime */ : 1 /* ReferenceOwnership.kUserland */,
                        runtimeAllocated: 1
                    };
                    emnapiExternalMemory.wasmMemoryViewTable.set(buffer_1, viewDescriptor);
                    (_a = emnapiExternalMemory.registry) === null || _a === void 0 ? void 0 : _a.register(viewDescriptor, pointer);
                    value = emnapiCtx.addToCurrentScope(buffer_1).id;
                    HEAP_DATA_VIEW.setUint32(result, value, true);
                    HEAP_DATA_VIEW.setUint32(data, pointer, true);
                }
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ippppp
         */
        function napi_create_buffer_copy(env, length, data, result_data, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var Buffer = emnapiCtx.feature.Buffer;
                if (!Buffer) {
                    throw emnapiCtx.createNotSupportBufferError('napi_create_buffer_copy', '');
                }
                var arrayBuffer = emnapiCreateArrayBuffer(length, result_data, false);
                var buffer = Buffer.from(arrayBuffer);
                buffer.set(new Uint8Array(wasmMemory.buffer).subarray(data, data + length));
                value = emnapiCtx.addToCurrentScope(buffer).id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ipppppp
         */
        function napi_create_external_buffer(env, length, data, finalize_cb, finalize_hint, result) {
            return emnapi_create_memory_view(env, -2 /* emnapi_memory_view_type.emnapi_buffer */, data, length, finalize_cb, finalize_hint, result);
        }
        /**
         * @__sig ippppp
         */
        function node_api_create_buffer_from_arraybuffer(env, arraybuffer, byte_offset, byte_length, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!arraybuffer)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                byte_offset = byte_offset >>> 0;
                byte_length = byte_length >>> 0;
                var handle = emnapiCtx.handleStore.get(arraybuffer);
                if (!handle.isArrayBuffer()) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var buffer = handle.value;
                if ((byte_length + byte_offset) > buffer.byteLength) {
                    var err = new RangeError('The byte offset + length is out of range');
                    err.code = 'ERR_OUT_OF_RANGE';
                    throw err;
                }
                var Buffer = emnapiCtx.feature.Buffer;
                if (!Buffer) {
                    throw emnapiCtx.createNotSupportBufferError('node_api_create_buffer_from_arraybuffer', '');
                }
                var out = Buffer.from(buffer, byte_offset, byte_length);
                if (buffer === wasmMemory.buffer) {
                    if (!emnapiExternalMemory.wasmMemoryViewTable.has(out)) {
                        emnapiExternalMemory.wasmMemoryViewTable.set(out, {
                            Ctor: Buffer,
                            address: byte_offset,
                            length: byte_length,
                            ownership: 1 /* ReferenceOwnership.kUserland */,
                            runtimeAllocated: 0
                        });
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                value = emnapiCtx.addToCurrentScope(out).id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ippppp
         */
        function napi_create_dataview(env, byte_length, arraybuffer, byte_offset, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!arraybuffer)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                byte_length = byte_length >>> 0;
                byte_offset = byte_offset >>> 0;
                var value = emnapiCtx.handleStore.get(arraybuffer).value;
                var createDataview = function (buffer) {
                    if ((byte_length + byte_offset) > buffer.byteLength) {
                        var err = new RangeError('byte_offset + byte_length should be less than or equal to the size in bytes of the array passed in');
                        err.code = 'ERR_NAPI_INVALID_DATAVIEW_ARGS';
                        throw err;
                    }
                    var dataview = new DataView(buffer, byte_offset, byte_length);
                    if (buffer === wasmMemory.buffer) {
                        if (!emnapiExternalMemory.wasmMemoryViewTable.has(dataview)) {
                            emnapiExternalMemory.wasmMemoryViewTable.set(dataview, {
                                Ctor: DataView,
                                address: byte_offset,
                                length: byte_length,
                                ownership: 1 /* ReferenceOwnership.kUserland */,
                                runtimeAllocated: 0
                            });
                        }
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    var v = emnapiCtx.addToCurrentScope(dataview).id;
                    var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                    HEAP_DATA_VIEW.setUint32(result, v, true);
                    return envObject.getReturnStatus();
                };
                if (value instanceof ArrayBuffer || emnapiExternalMemory.isSharedArrayBuffer(value)) {
                    return createDataview(value);
                }
                else {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /**
         * @__sig ipppp
         */
        function node_api_symbol_for(env, utf8description, length, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var autoLength = length === -1;
            var sizelength = length >>> 0;
            if (length !== 0) {
                if (!utf8description)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            if (!(autoLength || (sizelength <= 2147483647))) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            var descriptionString = emnapiString.UTF8ToString(utf8description, length);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = emnapiCtx.addToCurrentScope(Symbol.for(descriptionString)).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        var createMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            napi_create_array: napi_create_array,
            napi_create_array_with_length: napi_create_array_with_length,
            napi_create_arraybuffer: napi_create_arraybuffer,
            napi_create_buffer: napi_create_buffer,
            napi_create_buffer_copy: napi_create_buffer_copy,
            napi_create_dataview: napi_create_dataview,
            napi_create_date: napi_create_date,
            napi_create_external: napi_create_external,
            napi_create_external_arraybuffer: napi_create_external_arraybuffer,
            napi_create_external_buffer: napi_create_external_buffer,
            napi_create_object: napi_create_object,
            napi_create_symbol: napi_create_symbol,
            napi_create_typedarray: napi_create_typedarray,
            node_api_create_buffer_from_arraybuffer: node_api_create_buffer_from_arraybuffer,
            node_api_create_object_with_properties: node_api_create_object_with_properties,
            node_api_create_sharedarraybuffer: node_api_create_sharedarraybuffer,
            node_api_symbol_for: node_api_symbol_for
        });
        /** @__sig ipip */
        function napi_get_boolean(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v = value === 0 ? 3 /* GlobalHandle.FALSE */ : 4 /* GlobalHandle.TRUE */;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, v, true);
            return envObject.clearLastError();
        }
        /** @__sig ipp */
        function napi_get_global(env, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = 5 /* GlobalHandle.GLOBAL */;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        /** @__sig ipp */
        function napi_get_null(env, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = 2 /* GlobalHandle.NULL */;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        /** @__sig ipp */
        function napi_get_undefined(env, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = 1 /* GlobalHandle.UNDEFINED */;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        var globalMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            napi_get_boolean: napi_get_boolean,
            napi_get_global: napi_get_global,
            napi_get_null: napi_get_null,
            napi_get_undefined: napi_get_undefined
        });
        /** @__sig ipppp */
        function napi_set_instance_data(env, data, finalize_cb, finalize_hint) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            var envObject = emnapiCtx.envStore.get(env);
            envObject.setInstanceData(data, finalize_cb, finalize_hint);
            return envObject.clearLastError();
        }
        /** @__sig ipp */
        function napi_get_instance_data(env, data) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            var envObject = emnapiCtx.envStore.get(env);
            if (!data)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = envObject.getInstanceData();
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(data, value, true);
            return envObject.clearLastError();
        }
        var envMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            napi_get_instance_data: napi_get_instance_data,
            napi_set_instance_data: napi_set_instance_data
        });
        /** @__sig vpppp */
        function _emnapi_get_last_error_info(env, error_code, engine_error_code, engine_reserved) {
            var envObject = emnapiCtx.envStore.get(env);
            var lastError = envObject.lastError;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var errorCode = lastError.errorCode;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var engineErrorCode = lastError.engineErrorCode >>> 0;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var engineReserved = lastError.engineReserved;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt32(error_code, errorCode, true);
            HEAP_DATA_VIEW.setUint32(engine_error_code, engineErrorCode, true);
            HEAP_DATA_VIEW.setUint32(engine_reserved, engineReserved, true);
        }
        /** @__sig ipp */
        function napi_throw(env, error) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!error)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                envObject.tryCatch.setError(emnapiCtx.handleStore.get(error).value);
                return envObject.clearLastError();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function napi_throw_error(env, code, msg) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!msg)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var error = new Error(emnapiString.UTF8ToString(msg, -1));
                if (code)
                    error.code = emnapiString.UTF8ToString(code, -1);
                envObject.tryCatch.setError(error);
                return envObject.clearLastError();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function napi_throw_type_error(env, code, msg) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!msg)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var error = new TypeError(emnapiString.UTF8ToString(msg, -1));
                if (code)
                    error.code = emnapiString.UTF8ToString(code, -1);
                envObject.tryCatch.setError(error);
                return envObject.clearLastError();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function napi_throw_range_error(env, code, msg) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!msg)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var error = new RangeError(emnapiString.UTF8ToString(msg, -1));
                if (code)
                    error.code = emnapiString.UTF8ToString(code, -1);
                envObject.tryCatch.setError(error);
                return envObject.clearLastError();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function node_api_throw_syntax_error(env, code, msg) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!msg)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var error = new SyntaxError(emnapiString.UTF8ToString(msg, -1));
                if (code)
                    error.code = emnapiString.UTF8ToString(code, -1);
                envObject.tryCatch.setError(error);
                return envObject.clearLastError();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipp */
        function napi_is_exception_pending(env, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r = envObject.tryCatch.hasCaught();
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt8(result, r ? 1 : 0, true);
            return envObject.clearLastError();
        }
        /** @__sig ipppp */
        function napi_create_error(env, code, msg, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!msg)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var msgValue = emnapiCtx.handleStore.get(msg).value;
            if (typeof msgValue !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            var error = new Error(msgValue);
            if (code) {
                var codeValue = emnapiCtx.handleStore.get(code).value;
                if (typeof codeValue !== 'string') {
                    return envObject.setLastError(3 /* napi_status.napi_string_expected */);
                }
                error.code = codeValue;
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = emnapiCtx.addToCurrentScope(error).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        /** @__sig ipppp */
        function napi_create_type_error(env, code, msg, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!msg)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var msgValue = emnapiCtx.handleStore.get(msg).value;
            if (typeof msgValue !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            var error = new TypeError(msgValue);
            if (code) {
                var codeValue = emnapiCtx.handleStore.get(code).value;
                if (typeof codeValue !== 'string') {
                    return envObject.setLastError(3 /* napi_status.napi_string_expected */);
                }
                error.code = codeValue;
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = emnapiCtx.addToCurrentScope(error).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        /** @__sig ipppp */
        function napi_create_range_error(env, code, msg, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!msg)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var msgValue = emnapiCtx.handleStore.get(msg).value;
            if (typeof msgValue !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            var error = new RangeError(msgValue);
            if (code) {
                var codeValue = emnapiCtx.handleStore.get(code).value;
                if (typeof codeValue !== 'string') {
                    return envObject.setLastError(3 /* napi_status.napi_string_expected */);
                }
                error.code = codeValue;
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = emnapiCtx.addToCurrentScope(error).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        /** @__sig ipppp */
        function node_api_create_syntax_error(env, code, msg, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!msg)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var msgValue = emnapiCtx.handleStore.get(msg).value;
            if (typeof msgValue !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            var error = new SyntaxError(msgValue);
            if (code) {
                var codeValue = emnapiCtx.handleStore.get(code).value;
                if (typeof codeValue !== 'string') {
                    return envObject.setLastError(3 /* napi_status.napi_string_expected */);
                }
                error.code = codeValue;
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = emnapiCtx.addToCurrentScope(error).id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        /** @__sig ipp */
        function napi_get_and_clear_last_exception(env, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            if (!envObject.tryCatch.hasCaught()) {
                HEAP_DATA_VIEW.setUint32(result, 1, true); // ID_UNDEFINED
                return envObject.clearLastError();
            }
            else {
                var err = envObject.tryCatch.exception();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var value = envObject.ensureHandleId(err);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                envObject.tryCatch.reset();
            }
            return envObject.clearLastError();
        }
        /** @__sig vpppp */
        function napi_fatal_error(location, location_len, message, message_len) {
            var locationStr = emnapiString.UTF8ToString(location, location_len);
            var messageStr = emnapiString.UTF8ToString(message, message_len);
            if (emnapiNodeBinding) {
                emnapiNodeBinding.napi.fatalError(locationStr, messageStr);
            }
            else {
                abort('FATAL ERROR: ' + locationStr + ' ' + messageStr);
            }
        }
        /** @__sig ipp */
        function napi_fatal_exception(env, err) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!err)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var error = envObject.ctx.handleStore.get(err);
                try {
                    envObject.triggerFatalException(error.value);
                }
                catch (_) {
                    return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
                }
                return envObject.clearLastError();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        var errorMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            _emnapi_get_last_error_info: _emnapi_get_last_error_info,
            napi_create_error: napi_create_error,
            napi_create_range_error: napi_create_range_error,
            napi_create_type_error: napi_create_type_error,
            napi_fatal_error: napi_fatal_error,
            napi_fatal_exception: napi_fatal_exception,
            napi_get_and_clear_last_exception: napi_get_and_clear_last_exception,
            napi_is_exception_pending: napi_is_exception_pending,
            napi_throw: napi_throw,
            napi_throw_error: napi_throw_error,
            napi_throw_range_error: napi_throw_range_error,
            napi_throw_type_error: napi_throw_type_error,
            node_api_create_syntax_error: node_api_create_syntax_error,
            node_api_throw_syntax_error: node_api_throw_syntax_error
        });
        /** @__sig ipppppp */
        function _emnapi_create_function(env, utf8name, length, cb, data, result) {
            var envObject = emnapiCtx.envStore.get(env);
            var fresult = emnapiCreateFunction(envObject, utf8name, length, cb, data);
            if (fresult.status !== 0 /* napi_status.napi_ok */)
                return envObject.setLastError(fresult.status);
            var f = fresult.f;
            var valueHandle = emnapiCtx.addToCurrentScope(f);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value = valueHandle.id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.getReturnStatus();
        }
        /** @__sig ipppppp */
        function napi_create_function(env, utf8name, length, cb, data, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!cb)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                return _emnapi_create_function(env, utf8name, length, cb, data, result);
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipppppp */
        function napi_get_cb_info(env, cbinfo, argc, argv, this_arg, data) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            var envObject = emnapiCtx.envStore.get(env);
            if (!cbinfo)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var cbinfoValue = emnapiCtx.scopeStore.get(cbinfo).callbackInfo;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            if (argv) {
                if (!argc)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var argcValue = HEAP_DATA_VIEW.getUint32(argc, true);
                var len = cbinfoValue.args.length;
                var arrlen = argcValue < len ? argcValue : len;
                var i = 0;
                for (; i < arrlen; i++) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    var argVal = envObject.ensureHandleId(cbinfoValue.args[i]);
                    HEAP_DATA_VIEW.setUint32(argv + i * 4, argVal, true);
                }
                if (i < argcValue) {
                    for (; i < argcValue; i++) {
                        HEAP_DATA_VIEW.setUint32(argv + i * 4, 1, true);
                    }
                }
            }
            if (argc) {
                HEAP_DATA_VIEW.setUint32(argc, cbinfoValue.args.length, true);
            }
            if (this_arg) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var v = envObject.ensureHandleId(cbinfoValue.thiz);
                HEAP_DATA_VIEW.setUint32(this_arg, v, true);
            }
            if (data) {
                HEAP_DATA_VIEW.setUint32(data, cbinfoValue.data, true);
            }
            return envObject.clearLastError();
        }
        /** @__sig ipppppp */
        function napi_call_function(env, recv, func, argc, argv, result) {
            var i = 0;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!recv)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                argc = argc >>> 0;
                if (argc > 0) {
                    if (!argv)
                        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var v8recv = emnapiCtx.handleStore.get(recv).value;
                if (!func)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var v8func = emnapiCtx.handleStore.get(func).value;
                if (typeof v8func !== 'function')
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var args = [];
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                for (; i < argc; i++) {
                    var argVal = HEAP_DATA_VIEW.getUint32(argv + i * 4, true);
                    args.push(emnapiCtx.handleStore.get(argVal).value);
                }
                var ret = v8func.apply(v8recv, args);
                if (result) {
                    v = envObject.ensureHandleId(ret);
                    HEAP_DATA_VIEW.setUint32(result, v, true);
                }
                return envObject.clearLastError();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippppp */
        function napi_new_instance(env, constructor, argc, argv, result) {
            var i;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!constructor)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                argc = argc >>> 0;
                if (argc > 0) {
                    if (!argv)
                        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var Ctor = emnapiCtx.handleStore.get(constructor).value;
                if (typeof Ctor !== 'function')
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var ret = void 0;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                if (emnapiCtx.feature.supportReflect) {
                    var argList = Array(argc);
                    for (i = 0; i < argc; i++) {
                        var argVal = HEAP_DATA_VIEW.getUint32(argv + i * 4, true);
                        argList[i] = emnapiCtx.handleStore.get(argVal).value;
                    }
                    ret = Reflect.construct(Ctor, argList, Ctor);
                }
                else {
                    var args = Array(argc + 1);
                    args[0] = undefined;
                    for (i = 0; i < argc; i++) {
                        var argVal = HEAP_DATA_VIEW.getUint32(argv + i * 4, true);
                        args[i + 1] = emnapiCtx.handleStore.get(argVal).value;
                    }
                    var BoundCtor = Ctor.bind.apply(Ctor, args);
                    ret = new BoundCtor();
                }
                if (result) {
                    v = envObject.ensureHandleId(ret);
                    HEAP_DATA_VIEW.setUint32(result, v, true);
                }
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function napi_get_new_target(env, cbinfo, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!cbinfo)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var cbinfoValue = emnapiCtx.scopeStore.get(cbinfo).callbackInfo;
            var thiz = cbinfoValue.thiz, fn = cbinfoValue.fn;
            // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/no-unused-vars
            var value = thiz == null || thiz.constructor == null
                ? 0
                : thiz instanceof fn
                    ? envObject.ensureHandleId(thiz.constructor)
                    : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, value, true);
            return envObject.clearLastError();
        }
        var functionMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            _emnapi_create_function: _emnapi_create_function,
            napi_call_function: napi_call_function,
            napi_create_function: napi_create_function,
            napi_get_cb_info: napi_get_cb_info,
            napi_get_new_target: napi_get_new_target,
            napi_new_instance: napi_new_instance
        });
        /** @__sig ipp */
        function napi_open_handle_scope(env, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var scope = emnapiCtx.openScope(envObject);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, scope.id, true);
            return envObject.clearLastError();
        }
        /** @__sig ipp */
        function napi_close_handle_scope(env, scope) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!scope)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if ((envObject.openHandleScopes === 0)) {
                return 13 /* napi_status.napi_handle_scope_mismatch */;
            }
            emnapiCtx.closeScope(envObject);
            return envObject.clearLastError();
        }
        /** @__sig ipp */
        function napi_open_escapable_handle_scope(env, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var scope = emnapiCtx.openScope(envObject);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, scope.id, true);
            return envObject.clearLastError();
        }
        /** @__sig ipp */
        function napi_close_escapable_handle_scope(env, scope) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!scope)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if ((envObject.openHandleScopes === 0)) {
                return 13 /* napi_status.napi_handle_scope_mismatch */;
            }
            emnapiCtx.closeScope(envObject);
            return envObject.clearLastError();
        }
        /** @__sig ipppp */
        function napi_escape_handle(env, scope, escapee, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!scope)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!escapee)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var scopeObject = emnapiCtx.scopeStore.get(scope);
            if (!scopeObject.escapeCalled()) {
                var newHandle = scopeObject.escape(escapee);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                var value = newHandle ? newHandle.id : 0;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.clearLastError();
            }
            return envObject.setLastError(12 /* napi_status.napi_escape_called_twice */);
        }
        /** @__sig ippip */
        function napi_create_reference(env, value, initial_refcount, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var handle = emnapiCtx.handleStore.get(value);
            if (envObject.moduleApiVersion < 10) {
                if (!(handle.isObject() || handle.isFunction() || handle.isSymbol())) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var ref = emnapiCtx.createReference(envObject, handle.id, initial_refcount >>> 0, 1 /* ReferenceOwnership.kUserland */);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, ref.id, true);
            return envObject.clearLastError();
        }
        /** @__sig ipp */
        function napi_delete_reference(env, ref) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            var envObject = emnapiCtx.envStore.get(env);
            if (!ref)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            emnapiCtx.refStore.get(ref).dispose();
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function napi_reference_ref(env, ref, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!ref)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var count = emnapiCtx.refStore.get(ref).ref();
            if (result) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, count, true);
            }
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function napi_reference_unref(env, ref, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!ref)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var reference = emnapiCtx.refStore.get(ref);
            var refcount = reference.refcount();
            if (refcount === 0) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var count = reference.unref();
            if (result) {
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, count, true);
            }
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function napi_get_reference_value(env, ref, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!ref)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var reference = emnapiCtx.refStore.get(ref);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var handleId = reference.get(envObject);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, handleId, true);
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function napi_add_env_cleanup_hook(env, fun, arg) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            var envObject = emnapiCtx.envStore.get(env);
            if (!fun)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            emnapiCtx.addCleanupHook(envObject, fun, arg);
            return 0 /* napi_status.napi_ok */;
        }
        /** @__sig ippp */
        function napi_remove_env_cleanup_hook(env, fun, arg) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            var envObject = emnapiCtx.envStore.get(env);
            if (!fun)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            emnapiCtx.removeCleanupHook(envObject, fun, arg);
            return 0 /* napi_status.napi_ok */;
        }
        /** @__sig vp */
        function _emnapi_env_ref(env) {
            var envObject = emnapiCtx.envStore.get(env);
            envObject.ref();
        }
        /** @__sig vp */
        function _emnapi_env_unref(env) {
            var envObject = emnapiCtx.envStore.get(env);
            envObject.unref();
        }
        var lifeMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            _emnapi_env_ref: _emnapi_env_ref,
            _emnapi_env_unref: _emnapi_env_unref,
            napi_add_env_cleanup_hook: napi_add_env_cleanup_hook,
            napi_close_escapable_handle_scope: napi_close_escapable_handle_scope,
            napi_close_handle_scope: napi_close_handle_scope,
            napi_create_reference: napi_create_reference,
            napi_delete_reference: napi_delete_reference,
            napi_escape_handle: napi_escape_handle,
            napi_get_reference_value: napi_get_reference_value,
            napi_open_escapable_handle_scope: napi_open_escapable_handle_scope,
            napi_open_handle_scope: napi_open_handle_scope,
            napi_reference_ref: napi_reference_ref,
            napi_reference_unref: napi_reference_unref,
            napi_remove_env_cleanup_hook: napi_remove_env_cleanup_hook
        });
        /** @__sig ippi */
        function _emnapi_get_filename(env, buf, len) {
            var envObject = emnapiCtx.envStore.get(env);
            var filename = envObject.filename;
            if (!buf) {
                return emnapiString.lengthBytesUTF8(filename);
            }
            return emnapiString.stringToUTF8(filename, buf, len);
        }
        var miscellaneousMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            _emnapi_get_filename: _emnapi_get_filename
        });
        /** @__sig ippp */
        function napi_create_promise(env, deferred, promise) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var deferredObjectId, value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!deferred)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!promise)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                var p = new Promise(function (resolve, reject) {
                    var deferredObject = emnapiCtx.createDeferred({ resolve: resolve, reject: reject });
                    deferredObjectId = deferredObject.id;
                    HEAP_DATA_VIEW.setUint32(deferred, deferredObjectId, true);
                });
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                value = emnapiCtx.addToCurrentScope(p).id;
                HEAP_DATA_VIEW.setUint32(promise, value, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function napi_resolve_deferred(env, deferred, resolution) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!deferred)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!resolution)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var deferredObject = emnapiCtx.deferredStore.get(deferred);
                deferredObject.resolve(emnapiCtx.handleStore.get(resolution).value);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function napi_reject_deferred(env, deferred, resolution) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!deferred)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!resolution)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var deferredObject = emnapiCtx.deferredStore.get(deferred);
                deferredObject.reject(emnapiCtx.handleStore.get(resolution).value);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function napi_is_promise(env, value, is_promise) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!is_promise)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var h = emnapiCtx.handleStore.get(value);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r = h.isPromise() ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt8(is_promise, r, true);
            return envObject.clearLastError();
        }
        var promiseMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            napi_create_promise: napi_create_promise,
            napi_is_promise: napi_is_promise,
            napi_reject_deferred: napi_reject_deferred,
            napi_resolve_deferred: napi_resolve_deferred
        });
        /** @__sig ippiiip */
        function napi_get_all_property_names(env, object, key_mode, key_filter, key_conversion, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                if (h.value == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var obj = void 0;
                try {
                    obj = h.isObject() || h.isFunction() ? h.value : Object(h.value);
                }
                catch (_) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                if (key_mode !== 0 /* napi_key_collection_mode.napi_key_include_prototypes */ && key_mode !== 1 /* napi_key_collection_mode.napi_key_own_only */) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                if (key_conversion !== 0 /* napi_key_conversion.napi_key_keep_numbers */ && key_conversion !== 1 /* napi_key_conversion.napi_key_numbers_to_strings */) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var props = [];
                var names = void 0;
                var symbols = void 0;
                var i = void 0;
                var own = true;
                var integerIndiceRegex = /^(0|[1-9][0-9]*)$/;
                do {
                    names = Object.getOwnPropertyNames(obj);
                    symbols = Object.getOwnPropertySymbols(obj);
                    for (i = 0; i < names.length; i++) {
                        props.push({
                            name: integerIndiceRegex.test(names[i]) ? Number(names[i]) : names[i],
                            desc: Object.getOwnPropertyDescriptor(obj, names[i]),
                            own: own
                        });
                    }
                    for (i = 0; i < symbols.length; i++) {
                        props.push({
                            name: symbols[i],
                            desc: Object.getOwnPropertyDescriptor(obj, symbols[i]),
                            own: own
                        });
                    }
                    if (key_mode === 1 /* napi_key_collection_mode.napi_key_own_only */) {
                        break;
                    }
                    obj = Object.getPrototypeOf(obj);
                    own = false;
                } while (obj);
                var ret = [];
                var addName = function (ret, name, key_filter, conversion_mode) {
                    if (ret.indexOf(name) !== -1)
                        return;
                    if (conversion_mode === 0 /* napi_key_conversion.napi_key_keep_numbers */) {
                        ret.push(name);
                    }
                    else if (conversion_mode === 1 /* napi_key_conversion.napi_key_numbers_to_strings */) {
                        var realName = typeof name === 'number' ? String(name) : name;
                        if (typeof realName === 'string') {
                            if (!(key_filter & 8 /* napi_key_filter.napi_key_skip_strings */)) {
                                ret.push(realName);
                            }
                        }
                        else {
                            ret.push(realName);
                        }
                    }
                };
                for (i = 0; i < props.length; i++) {
                    var prop = props[i];
                    var name_1 = prop.name;
                    var desc = prop.desc;
                    if (key_filter === 0 /* napi_key_filter.napi_key_all_properties */) {
                        addName(ret, name_1, key_filter, key_conversion);
                    }
                    else {
                        if (key_filter & 8 /* napi_key_filter.napi_key_skip_strings */ && typeof name_1 === 'string') {
                            continue;
                        }
                        if (key_filter & 16 /* napi_key_filter.napi_key_skip_symbols */ && typeof name_1 === 'symbol') {
                            continue;
                        }
                        var shouldAdd = true;
                        switch (key_filter & 7) {
                            case 1 /* napi_key_filter.napi_key_writable */: {
                                shouldAdd = Boolean(desc.writable);
                                break;
                            }
                            case 2 /* napi_key_filter.napi_key_enumerable */: {
                                shouldAdd = Boolean(desc.enumerable);
                                break;
                            }
                            case (1 /* napi_key_filter.napi_key_writable */ | 2 /* napi_key_filter.napi_key_enumerable */): {
                                shouldAdd = Boolean(desc.writable && desc.enumerable);
                                break;
                            }
                            case 4 /* napi_key_filter.napi_key_configurable */: {
                                shouldAdd = Boolean(desc.configurable);
                                break;
                            }
                            case (4 /* napi_key_filter.napi_key_configurable */ | 1 /* napi_key_filter.napi_key_writable */): {
                                shouldAdd = Boolean(desc.configurable && desc.writable);
                                break;
                            }
                            case (4 /* napi_key_filter.napi_key_configurable */ | 2 /* napi_key_filter.napi_key_enumerable */): {
                                shouldAdd = Boolean(desc.configurable && desc.enumerable);
                                break;
                            }
                            case (4 /* napi_key_filter.napi_key_configurable */ | 2 /* napi_key_filter.napi_key_enumerable */ | 1 /* napi_key_filter.napi_key_writable */): {
                                shouldAdd = Boolean(desc.configurable && desc.enumerable && desc.writable);
                                break;
                            }
                        }
                        if (shouldAdd) {
                            addName(ret, name_1, key_filter, key_conversion);
                        }
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                value = emnapiCtx.addToCurrentScope(ret).id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function napi_get_property_names(env, object, result) {
            return napi_get_all_property_names(env, object, 0 /* napi_key_collection_mode.napi_key_include_prototypes */, 2 /* napi_key_filter.napi_key_enumerable */ | 16 /* napi_key_filter.napi_key_skip_symbols */, 1 /* napi_key_conversion.napi_key_numbers_to_strings */, result);
        }
        /** @__sig ipppp */
        function napi_set_property(env, object, key, value) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!key)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!value)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                if (!(h.isObject() || h.isFunction())) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                h.value[emnapiCtx.handleStore.get(key).value] = emnapiCtx.handleStore.get(value).value;
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipppp */
        function napi_has_property(env, object, key, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!key)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                if (h.value == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var v = void 0;
                try {
                    v = h.isObject() || h.isFunction() ? h.value : Object(h.value);
                }
                catch (_) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                r = (emnapiCtx.handleStore.get(key).value in v) ? 1 : 0;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setInt8(result, r, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipppp */
        function napi_get_property(env, object, key, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!key)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                if (h.value == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var v = void 0;
                try {
                    v = h.isObject() || h.isFunction() ? h.value : Object(h.value);
                }
                catch (_) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                value = envObject.ensureHandleId(v[emnapiCtx.handleStore.get(key).value]);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipppp */
        function napi_delete_property(env, object, key, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!key)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                if (!(h.isObject() || h.isFunction())) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                var propertyKey = emnapiCtx.handleStore.get(key).value;
                if (emnapiCtx.feature.supportReflect) {
                    r = Reflect.deleteProperty(h.value, propertyKey);
                }
                else {
                    try {
                        r = delete h.value[propertyKey];
                    }
                    catch (_) {
                        r = false;
                    }
                }
                if (result) {
                    var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                    HEAP_DATA_VIEW.setInt8(result, r ? 1 : 0, true);
                }
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipppp */
        function napi_has_own_property(env, object, key, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!key)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                if (h.value == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var v = void 0;
                try {
                    v = h.isObject() || h.isFunction() ? h.value : Object(h.value);
                }
                catch (_) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                var prop = emnapiCtx.handleStore.get(key).value;
                if (typeof prop !== 'string' && typeof prop !== 'symbol') {
                    return envObject.setLastError(4 /* napi_status.napi_name_expected */);
                }
                r = Object.prototype.hasOwnProperty.call(v, emnapiCtx.handleStore.get(key).value);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setInt8(result, r ? 1 : 0, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipppp */
        function napi_set_named_property(env, object, cname, value) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!value)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                if (!(h.isObject() || h.isFunction())) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                if (!cname) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                emnapiCtx.handleStore.get(object).value[emnapiString.UTF8ToString(cname, -1)] = emnapiCtx.handleStore.get(value).value;
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipppp */
        function napi_has_named_property(env, object, utf8name, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!utf8name) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var h = emnapiCtx.handleStore.get(object);
                if (h.value == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var v = void 0;
                try {
                    v = h.isObject() || h.isFunction() ? h.value : Object(h.value);
                }
                catch (_) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                r = emnapiString.UTF8ToString(utf8name, -1) in v;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setInt8(result, r ? 1 : 0, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipppp */
        function napi_get_named_property(env, object, utf8name, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!utf8name) {
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                var h = emnapiCtx.handleStore.get(object);
                if (h.value == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var v = void 0;
                try {
                    v = h.isObject() || h.isFunction() ? h.value : Object(h.value);
                }
                catch (_) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                value = envObject.ensureHandleId(v[emnapiString.UTF8ToString(utf8name, -1)]);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippip */
        function napi_set_element(env, object, index, value) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!value)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                if (!(h.isObject() || h.isFunction())) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                h.value[index >>> 0] = emnapiCtx.handleStore.get(value).value;
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippip */
        function napi_has_element(env, object, index, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                if (h.value == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var v = void 0;
                try {
                    v = h.isObject() || h.isFunction() ? h.value : Object(h.value);
                }
                catch (_) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                r = ((index >>> 0) in v) ? 1 : 0;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setInt8(result, r, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippip */
        function napi_get_element(env, object, index, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                if (h.value == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var v = void 0;
                try {
                    v = h.isObject() || h.isFunction() ? h.value : Object(h.value);
                }
                catch (_) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                value = envObject.ensureHandleId(v[index >>> 0]);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippip */
        function napi_delete_element(env, object, index, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                if (!(h.isObject() || h.isFunction())) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                if (emnapiCtx.feature.supportReflect) {
                    r = Reflect.deleteProperty(h.value, index >>> 0);
                }
                else {
                    try {
                        r = delete h.value[index >>> 0];
                    }
                    catch (_) {
                        r = false;
                    }
                }
                if (result) {
                    var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                    HEAP_DATA_VIEW.setInt8(result, r ? 1 : 0, true);
                }
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipppp */
        function napi_define_properties(env, object, property_count, properties) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var propPtr, attributes;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                property_count = property_count >>> 0;
                if (property_count > 0) {
                    if (!properties)
                        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                var maybeObject = h.value;
                if (!(h.isObject() || h.isFunction())) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                var propertyName = void 0;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                for (var i = 0; i < property_count; i++) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    propPtr = properties + (i * (4 * 8));
                    var utf8Name = HEAP_DATA_VIEW.getUint32(propPtr, true);
                    var name_2 = HEAP_DATA_VIEW.getUint32(propPtr + 4, true);
                    var method = HEAP_DATA_VIEW.getUint32(propPtr + 8, true);
                    var getter = HEAP_DATA_VIEW.getUint32(propPtr + 12, true);
                    var setter = HEAP_DATA_VIEW.getUint32(propPtr + 16, true);
                    var value = HEAP_DATA_VIEW.getUint32(propPtr + 20, true);
                    attributes = HEAP_DATA_VIEW.getInt32(propPtr + 24, true);
                    var data = HEAP_DATA_VIEW.getUint32(propPtr + 28, true);
                    if (utf8Name) {
                        propertyName = emnapiString.UTF8ToString(utf8Name, -1);
                    }
                    else {
                        if (!name_2) {
                            return envObject.setLastError(4 /* napi_status.napi_name_expected */);
                        }
                        propertyName = emnapiCtx.handleStore.get(name_2).value;
                        if (typeof propertyName !== 'string' && typeof propertyName !== 'symbol') {
                            return envObject.setLastError(4 /* napi_status.napi_name_expected */);
                        }
                    }
                    emnapiDefineProperty(envObject, maybeObject, propertyName, method, getter, setter, value, attributes, data);
                }
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipp */
        function napi_object_freeze(env, object) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                var maybeObject = h.value;
                if (!(h.isObject() || h.isFunction())) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                Object.freeze(maybeObject);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipp */
        function napi_object_seal(env, object) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(object);
                var maybeObject = h.value;
                if (!(h.isObject() || h.isFunction())) {
                    return envObject.setLastError(2 /* napi_status.napi_object_expected */);
                }
                Object.seal(maybeObject);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        var propertyMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            napi_define_properties: napi_define_properties,
            napi_delete_element: napi_delete_element,
            napi_delete_property: napi_delete_property,
            napi_get_all_property_names: napi_get_all_property_names,
            napi_get_element: napi_get_element,
            napi_get_named_property: napi_get_named_property,
            napi_get_property: napi_get_property,
            napi_get_property_names: napi_get_property_names,
            napi_has_element: napi_has_element,
            napi_has_named_property: napi_has_named_property,
            napi_has_own_property: napi_has_own_property,
            napi_has_property: napi_has_property,
            napi_object_freeze: napi_object_freeze,
            napi_object_seal: napi_object_seal,
            napi_set_element: napi_set_element,
            napi_set_named_property: napi_set_named_property,
            napi_set_property: napi_set_property
        });
        /** @__sig ippp */
        function napi_run_script(env, script, result) {
            var status;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var value;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!script)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var v8Script = emnapiCtx.handleStore.get(script);
                if (!v8Script.isString()) {
                    return envObject.setLastError(3 /* napi_status.napi_string_expected */);
                }
                var g = emnapiCtx.handleStore.get(5 /* GlobalHandle.GLOBAL */).value;
                var ret = g.eval(v8Script.value);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                value = envObject.ensureHandleId(ret);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, value, true);
                status = envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
            return status;
        }
        var scriptMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            napi_run_script: napi_run_script
        });
        /** @__sig ippp */
        function napi_typeof(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var v = emnapiCtx.handleStore.get(value);
            var r;
            if (v.isNumber()) {
                r = 3 /* napi_valuetype.napi_number */;
            }
            else if (v.isBigInt()) {
                r = 9 /* napi_valuetype.napi_bigint */;
            }
            else if (v.isString()) {
                r = 4 /* napi_valuetype.napi_string */;
            }
            else if (v.isFunction()) {
                // This test has to come before IsObject because IsFunction
                // implies IsObject
                r = 7 /* napi_valuetype.napi_function */;
            }
            else if (v.isExternal()) {
                // This test has to come before IsObject because IsExternal
                // implies IsObject
                r = 8 /* napi_valuetype.napi_external */;
            }
            else if (v.isObject()) {
                r = 6 /* napi_valuetype.napi_object */;
            }
            else if (v.isBoolean()) {
                r = 2 /* napi_valuetype.napi_boolean */;
            }
            else if (v.isUndefined()) {
                r = 0 /* napi_valuetype.napi_undefined */;
            }
            else if (v.isSymbol()) {
                r = 5 /* napi_valuetype.napi_symbol */;
            }
            else if (v.isNull()) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                r = 1 /* napi_valuetype.napi_null */;
            }
            else {
                // Should not get here unless V8 has added some new kind of value.
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt32(result, r, true);
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function napi_coerce_to_bool(env, value, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!value)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var handle = emnapiCtx.handleStore.get(value);
                v = handle.value ? 4 /* GlobalHandle.TRUE */ : 3 /* GlobalHandle.FALSE */;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, v, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function napi_coerce_to_number(env, value, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!value)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var handle = emnapiCtx.handleStore.get(value);
                if (handle.isBigInt()) {
                    throw new TypeError('Cannot convert a BigInt value to a number');
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                v = emnapiCtx.addToCurrentScope(Number(handle.value)).id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, v, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function napi_coerce_to_object(env, value, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!value)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var handle = emnapiCtx.handleStore.get(value);
                if (handle.value == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                v = envObject.ensureHandleId(Object(handle.value));
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, v, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function napi_coerce_to_string(env, value, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var v;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!value)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var handle = emnapiCtx.handleStore.get(value);
                if (handle.isSymbol()) {
                    throw new TypeError('Cannot convert a Symbol value to a string');
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                v = emnapiCtx.addToCurrentScope(String(handle.value)).id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setUint32(result, v, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipppp */
        function napi_instanceof(env, object, constructor, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!object)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!constructor)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setInt8(result, 0, true);
                var ctor = emnapiCtx.handleStore.get(constructor);
                if (!ctor.isFunction()) {
                    return envObject.setLastError(5 /* napi_status.napi_function_expected */);
                }
                var val = emnapiCtx.handleStore.get(object).value;
                var ret = val instanceof ctor.value;
                r = ret ? 1 : 0;
                HEAP_DATA_VIEW.setInt8(result, r, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ippp */
        function napi_is_array(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var h = emnapiCtx.handleStore.get(value);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r = h.isArray() ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt8(result, r, true);
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function napi_is_arraybuffer(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var h = emnapiCtx.handleStore.get(value);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r = h.isArrayBuffer() ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt8(result, r, true);
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function node_api_is_sharedarraybuffer(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var h = emnapiCtx.handleStore.get(value);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r = ((typeof SharedArrayBuffer === 'function' && h.value instanceof SharedArrayBuffer) ||
                (Object.prototype.toString.call(h.value) === '[object SharedArrayBuffer]'))
                ? 1
                : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt8(result, r, true);
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function napi_is_date(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var h = emnapiCtx.handleStore.get(value);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r = h.isDate() ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt8(result, r, true);
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function napi_is_error(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var val = emnapiCtx.handleStore.get(value).value;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r = (val instanceof Error) ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt8(result, r, true);
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function napi_is_typedarray(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var h = emnapiCtx.handleStore.get(value);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r = h.isTypedArray() ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt8(result, r, true);
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function napi_is_buffer(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var h = emnapiCtx.handleStore.get(value);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r = h.isBuffer(emnapiCtx.feature.Buffer) ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt8(result, r, true);
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function napi_is_dataview(env, value, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var h = emnapiCtx.handleStore.get(value);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r = h.isDataView() ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setInt8(result, r, true);
            return envObject.clearLastError();
        }
        /** @__sig ipppp */
        function napi_strict_equals(env, lhs, rhs, result) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var r;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!lhs)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!rhs)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var lv = emnapiCtx.handleStore.get(lhs).value;
                var rv = emnapiCtx.handleStore.get(rhs).value;
                r = (lv === rv) ? 1 : 0;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                HEAP_DATA_VIEW.setInt8(result, r, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        /** @__sig ipp */
        function napi_detach_arraybuffer(env, arraybuffer) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!arraybuffer)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            var value = emnapiCtx.handleStore.get(arraybuffer).value;
            if (!(value instanceof ArrayBuffer)) {
                if (typeof SharedArrayBuffer === 'function' && (value instanceof SharedArrayBuffer)) {
                    return envObject.setLastError(20 /* napi_status.napi_detachable_arraybuffer_expected */);
                }
                return envObject.setLastError(19 /* napi_status.napi_arraybuffer_expected */);
            }
            try {
                var MessageChannel_1 = emnapiCtx.feature.MessageChannel;
                var messageChannel = new MessageChannel_1();
                messageChannel.port1.postMessage(value, [value]);
            }
            catch (_) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            return envObject.clearLastError();
        }
        /** @__sig ippp */
        function napi_is_detached_arraybuffer(env, arraybuffer, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            var envObject = emnapiCtx.envStore.get(env);
            envObject.checkGCAccess();
            if (!envObject.tryCatch.isEmpty())
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            if (!envObject.canCallIntoJs())
                return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
            envObject.clearLastError();
            try {
                if (!arraybuffer)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                var h = emnapiCtx.handleStore.get(arraybuffer);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
                if (h.isArrayBuffer() && h.value.byteLength === 0) {
                    try {
                        // eslint-disable-next-line no-new
                        new Uint8Array(h.value);
                    }
                    catch (_) {
                        HEAP_DATA_VIEW.setInt8(result, 1, true);
                        return envObject.getReturnStatus();
                    }
                }
                HEAP_DATA_VIEW.setInt8(result, 0, true);
                return envObject.getReturnStatus();
            }
            catch (err) {
                envObject.tryCatch.setError(err);
                return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
            }
        }
        var valueOperationMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            napi_coerce_to_bool: napi_coerce_to_bool,
            napi_coerce_to_number: napi_coerce_to_number,
            napi_coerce_to_object: napi_coerce_to_object,
            napi_coerce_to_string: napi_coerce_to_string,
            napi_detach_arraybuffer: napi_detach_arraybuffer,
            napi_instanceof: napi_instanceof,
            napi_is_array: napi_is_array,
            napi_is_arraybuffer: napi_is_arraybuffer,
            napi_is_buffer: napi_is_buffer,
            napi_is_dataview: napi_is_dataview,
            napi_is_date: napi_is_date,
            napi_is_detached_arraybuffer: napi_is_detached_arraybuffer,
            napi_is_error: napi_is_error,
            napi_is_typedarray: napi_is_typedarray,
            napi_strict_equals: napi_strict_equals,
            napi_typeof: napi_typeof,
            node_api_is_sharedarraybuffer: node_api_is_sharedarraybuffer
        });
        /** @__sig ipp */
        function napi_get_version(env, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            var envObject = emnapiCtx.envStore.get(env);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            var NODE_API_SUPPORTED_VERSION_MAX = 10 /* Version.NODE_API_SUPPORTED_VERSION_MAX */;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer);
            HEAP_DATA_VIEW.setUint32(result, NODE_API_SUPPORTED_VERSION_MAX, true);
            return envObject.clearLastError();
        }
        var versionMod = /*#__PURE__*/ Object.freeze({
            __proto__: null,
            napi_get_version: napi_get_version
        });
        emnapiAWST.init();
        emnapiExternalMemory.init();
        emnapiString.init();
        emnapiTSFN.init();
        PThread.init();
        napiModule.emnapi.syncMemory = $emnapiSyncMemory;
        napiModule.emnapi.getMemoryAddress = $emnapiGetMemoryAddress;
        function addImports(mod) {
            var keys = Object.keys(mod);
            for (var i = 0; i < keys.length; ++i) {
                var k = keys[i];
                if (k.indexOf('$') === 0)
                    continue;
                if (k.indexOf('emnapi_') === 0) {
                    napiModule.imports.emnapi[k] = mod[k];
                }
                else if (k.indexOf('_emnapi_') === 0 || k === 'napi_set_last_error' || k === 'napi_clear_last_error') {
                    napiModule.imports.env[k] = mod[k];
                }
                else {
                    napiModule.imports.napi[k] = mod[k];
                }
            }
        }
        addImports(asyncMod);
        addImports(memoryMod);
        addImports(asyncWorkMod);
        addImports(utilMod);
        addImports(convert2cMod);
        addImports(convert2napiMod);
        addImports(createMod);
        addImports(globalMod);
        addImports(wrapMod);
        addImports(envMod);
        addImports(emnapiMod);
        addImports(errorMod);
        addImports(functionMod);
        addImports(lifeMod);
        addImports(miscellaneousMod);
        addImports(nodeMod);
        addImports(promiseMod);
        addImports(propertyMod);
        addImports(scriptMod);
        addImports(valueOperationMod);
        addImports(versionMod);
        napiModule.imports.napi.napi_create_threadsafe_function = napi_create_threadsafe_function;
        napiModule.imports.napi.napi_get_threadsafe_function_context = napi_get_threadsafe_function_context;
        napiModule.imports.napi.napi_call_threadsafe_function = napi_call_threadsafe_function;
        napiModule.imports.napi.napi_acquire_threadsafe_function = napi_acquire_threadsafe_function;
        napiModule.imports.napi.napi_release_threadsafe_function = napi_release_threadsafe_function;
        napiModule.imports.napi.napi_unref_threadsafe_function = napi_unref_threadsafe_function;
        napiModule.imports.napi.napi_ref_threadsafe_function = napi_ref_threadsafe_function;
        return napiModule;
    })();
    return napiModule;
}

function loadNapiModuleImpl(loadFn, userNapiModule, wasmInput, options) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    options = options !== null && options !== void 0 ? options : {};
    var getMemory = options.getMemory;
    var getTable = options.getTable;
    var beforeInit = options.beforeInit;
    if (getMemory != null && typeof getMemory !== 'function') {
        throw new TypeError('options.getMemory is not a function');
    }
    if (getTable != null && typeof getTable !== 'function') {
        throw new TypeError('options.getTable is not a function');
    }
    if (beforeInit != null && typeof beforeInit !== 'function') {
        throw new TypeError('options.beforeInit is not a function');
    }
    var napiModule;
    var isLoad = typeof userNapiModule === 'object' && userNapiModule !== null;
    if (isLoad) {
        if (userNapiModule.loaded) {
            throw new Error('napiModule has already loaded');
        }
        napiModule = userNapiModule;
    }
    else {
        napiModule = createNapiModule(options);
    }
    var wasi = options.wasi;
    var wasiThreads;
    var importObject = {
        env: napiModule.imports.env,
        napi: napiModule.imports.napi,
        emnapi: napiModule.imports.emnapi
    };
    if (wasi) {
        wasiThreads = new WASIThreads(napiModule.childThread
            ? {
                wasi: wasi,
                childThread: true,
                postMessage: napiModule.postMessage
            }
            : {
                wasi: wasi,
                threadManager: napiModule.PThread,
                waitThreadStart: napiModule.waitThreadStart
            });
        Object.assign(importObject, typeof wasi.getImportObject === 'function'
            ? wasi.getImportObject()
            : { wasi_snapshot_preview1: wasi.wasiImport });
        Object.assign(importObject, wasiThreads.getImportObject());
    }
    var overwriteImports = options.overwriteImports;
    if (typeof overwriteImports === 'function') {
        var newImportObject = overwriteImports(importObject);
        if (typeof newImportObject === 'object' && newImportObject !== null) {
            importObject = newImportObject;
        }
    }
    return loadFn(wasmInput, importObject, function (err, source) {
        if (err) {
            throw err;
        }
        var originalInstance = source.instance;
        var instance = originalInstance;
        var originalExports = originalInstance.exports;
        var exportMemory = 'memory' in originalExports;
        var importMemory = 'memory' in importObject.env;
        var memory = getMemory
            ? getMemory(originalExports)
            : exportMemory
                ? originalExports.memory
                : importMemory
                    ? importObject.env.memory
                    : undefined;
        if (!memory) {
            throw new Error('memory is neither exported nor imported');
        }
        var table = getTable ? getTable(originalExports) : originalExports.__indirect_function_table;
        if (wasi && !exportMemory) {
            var exports_1 = Object.create(null);
            Object.assign(exports_1, originalExports, { memory: memory });
            instance = { exports: exports_1 };
        }
        var module = source.module;
        if (wasi) {
            instance = wasiThreads.initialize(instance, module, memory);
        }
        else {
            napiModule.PThread.setup(module, memory);
        }
        var emnapiInit = function () {
            if (beforeInit) {
                beforeInit({
                    instance: originalInstance,
                    module: module
                });
            }
            napiModule.init({
                instance: instance,
                module: module,
                memory: memory,
                table: table
            });
            var ret = {
                instance: originalInstance,
                module: module,
                usedInstance: instance
            };
            if (!isLoad) {
                ret.napiModule = napiModule;
            }
            return ret;
        };
        if (napiModule.PThread.shouldPreloadWorkers()) {
            var poolReady = napiModule.PThread.loadWasmModuleToAllWorkers();
            if (loadFn === loadCallback) {
                return poolReady.then(emnapiInit);
            }
            else {
                throw new Error('Synchronous loading is not supported with worker pool (reuseWorker.size > 0)');
            }
        }
        return emnapiInit();
    });
}
function loadCallback(wasmInput, importObject, callback) {
    return load(wasmInput, importObject).then(function (source) {
        return callback(null, source);
    }, function (err) {
        return callback(err);
    });
}
function loadSyncCallback(wasmInput, importObject, callback) {
    var source;
    try {
        source = loadSync(wasmInput, importObject);
    }
    catch (err) {
        return callback(err);
    }
    return callback(null, source);
}
/** @public */
function loadNapiModule(napiModule, 
/** Only support `BufferSource` or `WebAssembly.Module` on Node.js */
wasmInput, options) {
    if (typeof napiModule !== 'object' || napiModule === null) {
        throw new TypeError('Invalid napiModule');
    }
    return loadNapiModuleImpl(loadCallback, napiModule, wasmInput, options);
}
/** @public */
function loadNapiModuleSync(napiModule, wasmInput, options) {
    if (typeof napiModule !== 'object' || napiModule === null) {
        throw new TypeError('Invalid napiModule');
    }
    return loadNapiModuleImpl(loadSyncCallback, napiModule, wasmInput, options);
}
/** @public */
function instantiateNapiModule(
/** Only support `BufferSource` or `WebAssembly.Module` on Node.js */
wasmInput, options) {
    return loadNapiModuleImpl(loadCallback, undefined, wasmInput, options);
}
/** @public */
function instantiateNapiModuleSync(wasmInput, options) {
    return loadNapiModuleImpl(loadSyncCallback, undefined, wasmInput, options);
}

/** @public */
var MessageHandler = /*#__PURE__*/ (function (_super) {
    __extends(MessageHandler, _super);
    function MessageHandler(options) {
        var _this = this;
        if (typeof options.onLoad !== 'function') {
            throw new TypeError('options.onLoad is not a function');
        }
        var userOnError = options.onError;
        _this = _super.call(this, __assign(__assign({}, options), { onError: function (err, type) {
                var _a;
                var emnapi_thread_crashed = (_a = _this.instance) === null || _a === void 0 ? void 0 : _a.exports.emnapi_thread_crashed;
                if (typeof emnapi_thread_crashed === 'function') {
                    emnapi_thread_crashed();
                } /* else {
                  tryWakeUpPthreadJoin(this.instance!)
                } */
                if (typeof userOnError === 'function') {
                    userOnError(err, type);
                }
                else {
                    throw err;
                }
            } })) || this;
        _this.napiModule = undefined;
        return _this;
    }
    MessageHandler.prototype.instantiate = function (data) {
        var _this = this;
        var source = this.onLoad(data);
        var then = source.then;
        if (typeof then === 'function') {
            return source.then(function (result) {
                _this.napiModule = result.napiModule;
                return result;
            });
        }
        this.napiModule = source.napiModule;
        return source;
    };
    MessageHandler.prototype.handle = function (e) {
        var _this = this;
        var _a;
        _super.prototype.handle.call(this, e);
        if ((_a = e === null || e === void 0 ? void 0 : e.data) === null || _a === void 0 ? void 0 : _a.__emnapi__) {
            var type = e.data.__emnapi__.type;
            var payload_1 = e.data.__emnapi__.payload;
            try {
                if (type === 'async-worker-init') {
                    this.handleAfterLoad(e, function () {
                        _this.napiModule.initWorker(payload_1.arg, payload_1.func);
                    });
                }
            }
            catch (err) {
                this.onError(err, type);
            }
        }
    };
    return MessageHandler;
}(ThreadMessageHandler));
// function tryWakeUpPthreadJoin (instance: WebAssembly.Instance): void {
//   // https://github.com/WebAssembly/wasi-libc/blob/574b88da481569b65a237cb80daf9a2d5aeaf82d/libc-top-half/musl/src/thread/pthread_join.c#L18-L21
//   const pthread_self = instance.exports.pthread_self as () => number
//   const memory = instance.exports.memory as WebAssembly.Memory
//   if (typeof pthread_self === 'function') {
//     const selfThread = pthread_self()
//     if (selfThread && memory) {
//       // https://github.com/WebAssembly/wasi-libc/blob/574b88da481569b65a237cb80daf9a2d5aeaf82d/libc-top-half/musl/src/internal/pthread_impl.h#L45
//       const detatchState = new Int32Array(memory.buffer, selfThread + 7 * 4 /** detach_state */, 1)
//       Atomics.store(detatchState, 0, 0)
//       Atomics.notify(detatchState, 0, Infinity)
//     }
//   }
// }

var version = "1.9.1";

export { MessageHandler, createNapiModule, instantiateNapiModule, instantiateNapiModuleSync, loadNapiModule, loadNapiModuleSync, version };
