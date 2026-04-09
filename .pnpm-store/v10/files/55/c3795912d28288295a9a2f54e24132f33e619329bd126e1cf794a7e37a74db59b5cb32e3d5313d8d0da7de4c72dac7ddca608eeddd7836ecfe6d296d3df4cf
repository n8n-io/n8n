(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.wasiThreads = {}));
})(this, (function (exports) {
    var _WebAssembly = typeof WebAssembly !== 'undefined'
        ? WebAssembly
        : typeof WXWebAssembly !== 'undefined'
            ? WXWebAssembly
            : undefined;
    var ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null &&
        typeof process.versions === 'object' && process.versions !== null &&
        typeof process.versions.node === 'string';
    function getPostMessage(options) {
        return typeof (options === null || options === void 0 ? void 0 : options.postMessage) === 'function'
            ? options.postMessage
            : typeof postMessage === 'function'
                ? postMessage
                : undefined;
    }
    function serizeErrorToBuffer(sab, code, error) {
        var i32array = new Int32Array(sab);
        Atomics.store(i32array, 0, code);
        if (code > 1 && error) {
            var name_1 = error.name;
            var message = error.message;
            var stack = error.stack;
            var nameBuffer = new TextEncoder().encode(name_1);
            var messageBuffer = new TextEncoder().encode(message);
            var stackBuffer = new TextEncoder().encode(stack);
            Atomics.store(i32array, 1, nameBuffer.length);
            Atomics.store(i32array, 2, messageBuffer.length);
            Atomics.store(i32array, 3, stackBuffer.length);
            var buffer = new Uint8Array(sab);
            buffer.set(nameBuffer, 16);
            buffer.set(messageBuffer, 16 + nameBuffer.length);
            buffer.set(stackBuffer, 16 + nameBuffer.length + messageBuffer.length);
        }
    }
    function deserizeErrorFromBuffer(sab) {
        var _a, _b;
        var i32array = new Int32Array(sab);
        var status = Atomics.load(i32array, 0);
        if (status <= 1) {
            return null;
        }
        var nameLength = Atomics.load(i32array, 1);
        var messageLength = Atomics.load(i32array, 2);
        var stackLength = Atomics.load(i32array, 3);
        var buffer = new Uint8Array(sab);
        var nameBuffer = buffer.slice(16, 16 + nameLength);
        var messageBuffer = buffer.slice(16 + nameLength, 16 + nameLength + messageLength);
        var stackBuffer = buffer.slice(16 + nameLength + messageLength, 16 + nameLength + messageLength + stackLength);
        var name = new TextDecoder().decode(nameBuffer);
        var message = new TextDecoder().decode(messageBuffer);
        var stack = new TextDecoder().decode(stackBuffer);
        var ErrorConstructor = (_a = globalThis[name]) !== null && _a !== void 0 ? _a : (name === 'RuntimeError' ? ((_b = _WebAssembly.RuntimeError) !== null && _b !== void 0 ? _b : Error) : Error);
        var error = new ErrorConstructor(message);
        Object.defineProperty(error, 'stack', {
            value: stack,
            writable: true,
            enumerable: false,
            configurable: true
        });
        return error;
    }
    /** @public */
    function isSharedArrayBuffer(value) {
        return ((typeof SharedArrayBuffer === 'function' && value instanceof SharedArrayBuffer) ||
            (Object.prototype.toString.call(value) === '[object SharedArrayBuffer]'));
    }
    /** @public */
    function isTrapError(e) {
        try {
            return e instanceof _WebAssembly.RuntimeError;
        }
        catch (_) {
            return false;
        }
    }

    function createMessage(type, payload) {
        return {
            __emnapi__: {
                type: type,
                payload: payload
            }
        };
    }

    var WASI_THREADS_MAX_TID = 0x1FFFFFFF;
    function checkSharedWasmMemory(wasmMemory) {
        if (wasmMemory) {
            if (!isSharedArrayBuffer(wasmMemory.buffer)) {
                throw new Error('Multithread features require shared wasm memory. ' +
                    'Try to compile with `-matomics -mbulk-memory` and use `--import-memory --shared-memory` during linking, ' +
                    'then create WebAssembly.Memory with `shared: true` option');
            }
        }
        else {
            if (typeof SharedArrayBuffer === 'undefined') {
                throw new Error('Current environment does not support SharedArrayBuffer, threads are not available!');
            }
        }
    }
    function getReuseWorker(value) {
        var _a;
        if (typeof value === 'boolean') {
            return value ? { size: 0, strict: false } : false;
        }
        if (typeof value === 'number') {
            if (!(value >= 0)) {
                throw new RangeError('reuseWorker: size must be a non-negative integer');
            }
            return { size: value, strict: false };
        }
        if (!value) {
            return false;
        }
        var size = (_a = Number(value.size)) !== null && _a !== void 0 ? _a : 0;
        var strict = Boolean(value.strict);
        if (!(size > 0) && strict) {
            throw new RangeError('reuseWorker: size must be set to positive integer if strict is set to true');
        }
        return { size: size, strict: strict };
    }
    var nextWorkerID = 0;
    /** @public */
    var ThreadManager = /*#__PURE__*/ (function () {
        function ThreadManager(options) {
            var _a;
            this.unusedWorkers = [];
            this.runningWorkers = [];
            this.pthreads = Object.create(null);
            this.wasmModule = null;
            this.wasmMemory = null;
            this.messageEvents = new WeakMap();
            if (!options) {
                throw new TypeError('ThreadManager(): options is not provided');
            }
            if ('childThread' in options) {
                this._childThread = Boolean(options.childThread);
            }
            else {
                this._childThread = false;
            }
            if (this._childThread) {
                this._onCreateWorker = undefined;
                this._reuseWorker = false;
                this._beforeLoad = undefined;
            }
            else {
                this._onCreateWorker = options.onCreateWorker;
                this._reuseWorker = getReuseWorker(options.reuseWorker);
                this._beforeLoad = options.beforeLoad;
            }
            this.printErr = (_a = options.printErr) !== null && _a !== void 0 ? _a : console.error.bind(console);
            this.threadSpawn = options.threadSpawn;
        }
        Object.defineProperty(ThreadManager.prototype, "nextWorkerID", {
            get: function () { return nextWorkerID; },
            enumerable: false,
            configurable: true
        });
        ThreadManager.prototype.init = function () {
            if (!this._childThread) {
                this.initMainThread();
            }
        };
        ThreadManager.prototype.initMainThread = function () {
            this.preparePool();
        };
        ThreadManager.prototype.preparePool = function () {
            if (this._reuseWorker) {
                if (this._reuseWorker.size) {
                    var pthreadPoolSize = this._reuseWorker.size;
                    while (pthreadPoolSize--) {
                        var worker = this.allocateUnusedWorker();
                        if (ENVIRONMENT_IS_NODE) {
                            // https://github.com/nodejs/node/issues/53036
                            worker.once('message', function () { });
                            worker.unref();
                        }
                    }
                }
            }
        };
        ThreadManager.prototype.shouldPreloadWorkers = function () {
            return !this._childThread && this._reuseWorker && this._reuseWorker.size > 0;
        };
        ThreadManager.prototype.loadWasmModuleToAllWorkers = function () {
            var _this_1 = this;
            var promises = Array(this.unusedWorkers.length);
            var _loop_1 = function (i) {
                var worker = this_1.unusedWorkers[i];
                if (ENVIRONMENT_IS_NODE)
                    worker.ref();
                promises[i] = this_1.loadWasmModuleToWorker(worker).then(function (w) {
                    if (ENVIRONMENT_IS_NODE)
                        worker.unref();
                    return w;
                }, function (e) {
                    if (ENVIRONMENT_IS_NODE)
                        worker.unref();
                    throw e;
                });
            };
            var this_1 = this;
            for (var i = 0; i < this.unusedWorkers.length; ++i) {
                _loop_1(i);
            }
            return Promise.all(promises).catch(function (err) {
                _this_1.terminateAllThreads();
                throw err;
            });
        };
        ThreadManager.prototype.preloadWorkers = function () {
            if (this.shouldPreloadWorkers()) {
                return this.loadWasmModuleToAllWorkers();
            }
            return Promise.resolve([]);
        };
        ThreadManager.prototype.setup = function (wasmModule, wasmMemory) {
            this.wasmModule = wasmModule;
            this.wasmMemory = wasmMemory;
        };
        ThreadManager.prototype.markId = function (worker) {
            if (worker.__emnapi_tid)
                return worker.__emnapi_tid;
            var tid = nextWorkerID + 43;
            nextWorkerID = (nextWorkerID + 1) % (WASI_THREADS_MAX_TID - 42);
            this.pthreads[tid] = worker;
            worker.__emnapi_tid = tid;
            return tid;
        };
        ThreadManager.prototype.returnWorkerToPool = function (worker) {
            var tid = worker.__emnapi_tid;
            if (tid !== undefined) {
                delete this.pthreads[tid];
            }
            this.unusedWorkers.push(worker);
            this.runningWorkers.splice(this.runningWorkers.indexOf(worker), 1);
            delete worker.__emnapi_tid;
            if (ENVIRONMENT_IS_NODE) {
                worker.unref();
            }
        };
        ThreadManager.prototype.loadWasmModuleToWorker = function (worker, sab) {
            var _this_1 = this;
            if (worker.whenLoaded)
                return worker.whenLoaded;
            var err = this.printErr;
            var beforeLoad = this._beforeLoad;
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            var _this = this;
            worker.whenLoaded = new Promise(function (resolve, reject) {
                var handleError = function (e) {
                    var message = 'worker sent an error!';
                    if (worker.__emnapi_tid !== undefined) {
                        message = 'worker (tid = ' + worker.__emnapi_tid + ') sent an error!';
                    }
                    if ('message' in e) {
                        err(message + ' ' + e.message);
                        if (e.message.indexOf('RuntimeError') !== -1 || e.message.indexOf('unreachable') !== -1) {
                            try {
                                _this.terminateAllThreads();
                            }
                            catch (_) { }
                        }
                    }
                    else {
                        err(message);
                    }
                    reject(e);
                    throw e;
                };
                var handleMessage = function (data) {
                    if (data.__emnapi__) {
                        var type = data.__emnapi__.type;
                        var payload = data.__emnapi__.payload;
                        if (type === 'loaded') {
                            worker.loaded = true;
                            if (ENVIRONMENT_IS_NODE && !worker.__emnapi_tid) {
                                worker.unref();
                            }
                            resolve(worker);
                            // if (payload.err) {
                            //   err('failed to load in child thread: ' + (payload.err.message || payload.err))
                            // }
                        }
                        else if (type === 'cleanup-thread') {
                            if (payload.tid in _this_1.pthreads) {
                                _this_1.cleanThread(worker, payload.tid);
                            }
                        }
                        else if (type === 'spawn-thread') {
                            _this_1.threadSpawn(payload.startArg, payload.errorOrTid);
                        }
                        else if (type === 'terminate-all-threads') {
                            _this_1.terminateAllThreads();
                        }
                    }
                };
                worker.onmessage = function (e) {
                    handleMessage(e.data);
                    _this_1.fireMessageEvent(worker, e);
                };
                worker.onerror = handleError;
                if (ENVIRONMENT_IS_NODE) {
                    worker.on('message', function (data) {
                        var _a, _b;
                        (_b = (_a = worker).onmessage) === null || _b === void 0 ? void 0 : _b.call(_a, {
                            data: data
                        });
                    });
                    worker.on('error', function (e) {
                        var _a, _b;
                        (_b = (_a = worker).onerror) === null || _b === void 0 ? void 0 : _b.call(_a, e);
                    });
                    worker.on('detachedExit', function () { });
                }
                if (typeof beforeLoad === 'function') {
                    beforeLoad(worker);
                }
                try {
                    worker.postMessage(createMessage('load', {
                        wasmModule: _this_1.wasmModule,
                        wasmMemory: _this_1.wasmMemory,
                        sab: sab
                    }));
                }
                catch (err) {
                    checkSharedWasmMemory(_this_1.wasmMemory);
                    throw err;
                }
            });
            return worker.whenLoaded;
        };
        ThreadManager.prototype.allocateUnusedWorker = function () {
            var _onCreateWorker = this._onCreateWorker;
            if (typeof _onCreateWorker !== 'function') {
                throw new TypeError('`options.onCreateWorker` is not provided');
            }
            var worker = _onCreateWorker({ type: 'thread', name: 'emnapi-pthread' });
            this.unusedWorkers.push(worker);
            return worker;
        };
        ThreadManager.prototype.getNewWorker = function (sab) {
            if (this._reuseWorker) {
                if (this.unusedWorkers.length === 0) {
                    if (this._reuseWorker.strict) {
                        if (!ENVIRONMENT_IS_NODE) {
                            var err = this.printErr;
                            err('Tried to spawn a new thread, but the thread pool is exhausted.\n' +
                                'This might result in a deadlock unless some threads eventually exit or the code explicitly breaks out to the event loop.');
                            return;
                        }
                    }
                    var worker_1 = this.allocateUnusedWorker();
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    this.loadWasmModuleToWorker(worker_1, sab);
                }
                return this.unusedWorkers.pop();
            }
            var worker = this.allocateUnusedWorker();
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.loadWasmModuleToWorker(worker, sab);
            return this.unusedWorkers.pop();
        };
        ThreadManager.prototype.cleanThread = function (worker, tid, force) {
            if (!force && this._reuseWorker) {
                this.returnWorkerToPool(worker);
            }
            else {
                delete this.pthreads[tid];
                var index = this.runningWorkers.indexOf(worker);
                if (index !== -1) {
                    this.runningWorkers.splice(index, 1);
                }
                this.terminateWorker(worker);
                delete worker.__emnapi_tid;
            }
        };
        ThreadManager.prototype.terminateWorker = function (worker) {
            var _this_1 = this;
            var _a;
            var tid = worker.__emnapi_tid;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            worker.terminate();
            (_a = this.messageEvents.get(worker)) === null || _a === void 0 ? void 0 : _a.clear();
            this.messageEvents.delete(worker);
            worker.onmessage = function (e) {
                if (e.data.__emnapi__) {
                    var err = _this_1.printErr;
                    err('received "' + e.data.__emnapi__.type + '" command from terminated worker: ' + tid);
                }
            };
        };
        ThreadManager.prototype.terminateAllThreads = function () {
            for (var i = 0; i < this.runningWorkers.length; ++i) {
                this.terminateWorker(this.runningWorkers[i]);
            }
            for (var i = 0; i < this.unusedWorkers.length; ++i) {
                this.terminateWorker(this.unusedWorkers[i]);
            }
            this.unusedWorkers = [];
            this.runningWorkers = [];
            this.pthreads = Object.create(null);
            this.preparePool();
        };
        ThreadManager.prototype.addMessageEventListener = function (worker, onMessage) {
            var listeners = this.messageEvents.get(worker);
            if (!listeners) {
                listeners = new Set();
                this.messageEvents.set(worker, listeners);
            }
            listeners.add(onMessage);
            return function () {
                listeners === null || listeners === void 0 ? void 0 : listeners.delete(onMessage);
            };
        };
        ThreadManager.prototype.fireMessageEvent = function (worker, e) {
            var listeners = this.messageEvents.get(worker);
            if (!listeners)
                return;
            var err = this.printErr;
            listeners.forEach(function (listener) {
                try {
                    listener(e);
                }
                catch (e) {
                    err(e.stack);
                }
            });
        };
        return ThreadManager;
    }());

    var kIsProxy = Symbol('kIsProxy');
    /** @public */
    function createInstanceProxy(instance, memory) {
        if (instance[kIsProxy])
            return instance;
        // https://github.com/nodejs/help/issues/4102
        var originalExports = instance.exports;
        var createHandler = function (target) {
            var handlers = [
                'apply',
                'construct',
                'defineProperty',
                'deleteProperty',
                'get',
                'getOwnPropertyDescriptor',
                'getPrototypeOf',
                'has',
                'isExtensible',
                'ownKeys',
                'preventExtensions',
                'set',
                'setPrototypeOf'
            ];
            var handler = {};
            var _loop_1 = function (i) {
                var name_1 = handlers[i];
                handler[name_1] = function () {
                    var args = Array.prototype.slice.call(arguments, 1);
                    args.unshift(target);
                    return Reflect[name_1].apply(Reflect, args);
                };
            };
            for (var i = 0; i < handlers.length; i++) {
                _loop_1(i);
            }
            return handler;
        };
        var handler = createHandler(originalExports);
        var _initialize = function () { };
        var _start = function () { return 0; };
        handler.get = function (_target, p, receiver) {
            var _a;
            if (p === 'memory') {
                return (_a = (typeof memory === 'function' ? memory() : memory)) !== null && _a !== void 0 ? _a : Reflect.get(originalExports, p, receiver);
            }
            if (p === '_initialize') {
                return p in originalExports ? _initialize : undefined;
            }
            if (p === '_start') {
                return p in originalExports ? _start : undefined;
            }
            return Reflect.get(originalExports, p, receiver);
        };
        handler.has = function (_target, p) {
            if (p === 'memory')
                return true;
            return Reflect.has(originalExports, p);
        };
        var exportsProxy = new Proxy(Object.create(null), handler);
        return new Proxy(instance, {
            get: function (target, p, receiver) {
                if (p === 'exports') {
                    return exportsProxy;
                }
                if (p === kIsProxy) {
                    return true;
                }
                return Reflect.get(target, p, receiver);
            }
        });
    }

    var patchedWasiInstances = new WeakMap();
    /** @public */
    var WASIThreads = /*#__PURE__*/ (function () {
        function WASIThreads(options) {
            var _this_1 = this;
            if (!options) {
                throw new TypeError('WASIThreads(): options is not provided');
            }
            if (!options.wasi) {
                throw new TypeError('WASIThreads(): options.wasi is not provided');
            }
            patchedWasiInstances.set(this, new WeakSet());
            var wasi = options.wasi;
            patchWasiInstance(this, wasi);
            this.wasi = wasi;
            if ('childThread' in options) {
                this.childThread = Boolean(options.childThread);
            }
            else {
                this.childThread = false;
            }
            this.PThread = undefined;
            if ('threadManager' in options) {
                if (typeof options.threadManager === 'function') {
                    this.PThread = options.threadManager();
                }
                else {
                    this.PThread = options.threadManager;
                }
            }
            else {
                if (!this.childThread) {
                    this.PThread = new ThreadManager(options);
                    this.PThread.init();
                }
            }
            var waitThreadStart = false;
            if ('waitThreadStart' in options) {
                waitThreadStart = typeof options.waitThreadStart === 'number' ? options.waitThreadStart : Boolean(options.waitThreadStart);
            }
            var postMessage = getPostMessage(options);
            if (this.childThread && typeof postMessage !== 'function') {
                throw new TypeError('options.postMessage is not a function');
            }
            this.postMessage = postMessage;
            var wasm64 = Boolean(options.wasm64);
            var threadSpawn = function (startArg, errorOrTid) {
                var _a;
                var EAGAIN = 6;
                var isNewABI = errorOrTid !== undefined;
                try {
                    checkSharedWasmMemory(_this_1.wasmMemory);
                }
                catch (err) {
                    (_a = _this_1.PThread) === null || _a === void 0 ? void 0 : _a.printErr(err.stack);
                    if (isNewABI) {
                        var struct_1 = new Int32Array(_this_1.wasmMemory.buffer, errorOrTid, 2);
                        Atomics.store(struct_1, 0, 1);
                        Atomics.store(struct_1, 1, EAGAIN);
                        Atomics.notify(struct_1, 1);
                        return 1;
                    }
                    else {
                        return -EAGAIN;
                    }
                }
                if (!isNewABI) {
                    var malloc = _this_1.wasmInstance.exports.malloc;
                    errorOrTid = wasm64 ? Number(malloc(BigInt(8))) : malloc(8);
                    if (!errorOrTid) {
                        return -48; /* ENOMEM */
                    }
                }
                var _free = _this_1.wasmInstance.exports.free;
                var free = wasm64 ? function (ptr) { _free(BigInt(ptr)); } : _free;
                var struct = new Int32Array(_this_1.wasmMemory.buffer, errorOrTid, 2);
                Atomics.store(struct, 0, 0);
                Atomics.store(struct, 1, 0);
                if (_this_1.childThread) {
                    postMessage(createMessage('spawn-thread', {
                        startArg: startArg,
                        errorOrTid: errorOrTid
                    }));
                    Atomics.wait(struct, 1, 0);
                    var isError = Atomics.load(struct, 0);
                    var result = Atomics.load(struct, 1);
                    if (isNewABI) {
                        return isError;
                    }
                    free(errorOrTid);
                    return isError ? -result : result;
                }
                var shouldWait = waitThreadStart || (waitThreadStart === 0);
                var sab;
                if (shouldWait) {
                    sab = new Int32Array(new SharedArrayBuffer(16 + 8192));
                    Atomics.store(sab, 0, 0);
                }
                var worker;
                var tid;
                var PThread = _this_1.PThread;
                try {
                    worker = PThread.getNewWorker(sab);
                    if (!worker) {
                        throw new Error('failed to get new worker');
                    }
                    tid = PThread.markId(worker);
                    if (ENVIRONMENT_IS_NODE) {
                        worker.unref();
                    }
                    worker.postMessage(createMessage('start', {
                        tid: tid,
                        arg: startArg,
                        sab: sab
                    }));
                    if (shouldWait) {
                        if (typeof waitThreadStart === 'number') {
                            var waitResult = Atomics.wait(sab, 0, 0, waitThreadStart);
                            if (waitResult === 'timed-out') {
                                try {
                                    PThread.cleanThread(worker, tid, true);
                                }
                                catch (_) { }
                                throw new Error('Spawning thread timed out. Please check if the worker is created successfully and if message is handled properly in the worker.');
                            }
                        }
                        else {
                            Atomics.wait(sab, 0, 0);
                        }
                        var r = Atomics.load(sab, 0);
                        if (r > 1) {
                            try {
                                PThread.cleanThread(worker, tid, true);
                            }
                            catch (_) { }
                            throw deserizeErrorFromBuffer(sab.buffer);
                        }
                    }
                }
                catch (e) {
                    Atomics.store(struct, 0, 1);
                    Atomics.store(struct, 1, EAGAIN);
                    Atomics.notify(struct, 1);
                    PThread === null || PThread === void 0 ? void 0 : PThread.printErr(e.stack);
                    if (isNewABI) {
                        return 1;
                    }
                    free(errorOrTid);
                    return -EAGAIN;
                }
                Atomics.store(struct, 0, 0);
                Atomics.store(struct, 1, tid);
                Atomics.notify(struct, 1);
                PThread.runningWorkers.push(worker);
                if (!shouldWait) {
                    worker.whenLoaded.catch(function (err) {
                        delete worker.whenLoaded;
                        PThread.cleanThread(worker, tid, true);
                        throw err;
                    });
                }
                if (isNewABI) {
                    return 0;
                }
                free(errorOrTid);
                return tid;
            };
            this.threadSpawn = threadSpawn;
            if (this.PThread) {
                this.PThread.threadSpawn = threadSpawn;
            }
        }
        WASIThreads.prototype.getImportObject = function () {
            return {
                wasi: {
                    'thread-spawn': this.threadSpawn
                }
            };
        };
        WASIThreads.prototype.setup = function (wasmInstance, wasmModule, wasmMemory) {
            wasmMemory !== null && wasmMemory !== void 0 ? wasmMemory : (wasmMemory = wasmInstance.exports.memory);
            this.wasmInstance = wasmInstance;
            this.wasmMemory = wasmMemory;
            if (this.PThread) {
                this.PThread.setup(wasmModule, wasmMemory);
            }
        };
        WASIThreads.prototype.preloadWorkers = function () {
            if (this.PThread) {
                return this.PThread.preloadWorkers();
            }
            return Promise.resolve([]);
        };
        /**
         * It's ok to call this method to a WASI command module.
         *
         * in child thread, must call this method instead of {@link WASIThreads.start} even if it's a WASI command module
         *
         * @returns A proxied WebAssembly instance if in child thread, other wise the original instance
         */
        WASIThreads.prototype.initialize = function (instance, module, memory) {
            var exports$1 = instance.exports;
            memory !== null && memory !== void 0 ? memory : (memory = exports$1.memory);
            if (this.childThread) {
                instance = createInstanceProxy(instance, memory);
            }
            this.setup(instance, module, memory);
            var wasi = this.wasi;
            if (('_start' in exports$1) && (typeof exports$1._start === 'function')) {
                if (this.childThread) {
                    wasi.start(instance);
                    try {
                        var kStarted = getWasiSymbol(wasi, 'kStarted');
                        wasi[kStarted] = false;
                    }
                    catch (_) { }
                }
                else {
                    setupInstance(wasi, instance);
                }
            }
            else {
                wasi.initialize(instance);
            }
            return instance;
        };
        /**
         * Equivalent to calling {@link WASIThreads.initialize} and then calling {@link WASIInstance.start}
         * ```js
         * this.initialize(instance, module, memory)
         * this.wasi.start(instance)
         * ```
         */
        WASIThreads.prototype.start = function (instance, module, memory) {
            var exports$1 = instance.exports;
            memory !== null && memory !== void 0 ? memory : (memory = exports$1.memory);
            if (this.childThread) {
                instance = createInstanceProxy(instance, memory);
            }
            this.setup(instance, module, memory);
            var exitCode = this.wasi.start(instance);
            return { exitCode: exitCode, instance: instance };
        };
        WASIThreads.prototype.terminateAllThreads = function () {
            var _a;
            if (!this.childThread) {
                (_a = this.PThread) === null || _a === void 0 ? void 0 : _a.terminateAllThreads();
            }
            else {
                this.postMessage(createMessage('terminate-all-threads', {}));
            }
        };
        return WASIThreads;
    }());
    function patchWasiInstance(wasiThreads, wasi) {
        var patched = patchedWasiInstances.get(wasiThreads);
        if (patched.has(wasi)) {
            return;
        }
        var _this = wasiThreads;
        var wasiImport = wasi.wasiImport;
        if (wasiImport) {
            var proc_exit_1 = wasiImport.proc_exit;
            wasiImport.proc_exit = function (code) {
                _this.terminateAllThreads();
                return proc_exit_1.call(this, code);
            };
        }
        if (!_this.childThread) {
            var start_1 = wasi.start;
            if (typeof start_1 === 'function') {
                wasi.start = function (instance) {
                    try {
                        return start_1.call(this, instance);
                    }
                    catch (err) {
                        if (isTrapError(err)) {
                            _this.terminateAllThreads();
                        }
                        throw err;
                    }
                };
            }
        }
        patched.add(wasi);
    }
    function getWasiSymbol(wasi, description) {
        var symbols = Object.getOwnPropertySymbols(wasi);
        var selectDescription = function (description) { return function (s) {
            if (s.description) {
                return s.description === description;
            }
            return s.toString() === "Symbol(".concat(description, ")");
        }; };
        if (Array.isArray(description)) {
            return description.map(function (d) { return symbols.filter(selectDescription(d))[0]; });
        }
        return symbols.filter(selectDescription(description))[0];
    }
    function setupInstance(wasi, instance) {
        var _a = getWasiSymbol(wasi, ['kInstance', 'kSetMemory']), kInstance = _a[0], kSetMemory = _a[1];
        wasi[kInstance] = instance;
        wasi[kSetMemory](instance.exports.memory);
    }

    /** @public */
    var ThreadMessageHandler = /*#__PURE__*/ (function () {
        function ThreadMessageHandler(options) {
            var postMsg = getPostMessage(options);
            if (typeof postMsg !== 'function') {
                throw new TypeError('options.postMessage is not a function');
            }
            this.postMessage = postMsg;
            this.onLoad = options === null || options === void 0 ? void 0 : options.onLoad;
            this.onError = typeof (options === null || options === void 0 ? void 0 : options.onError) === 'function' ? options.onError : function (_type, err) { throw err; };
            this.instance = undefined;
            // this.module = undefined
            this.messagesBeforeLoad = [];
        }
        /** @virtual */
        ThreadMessageHandler.prototype.instantiate = function (data) {
            if (typeof this.onLoad === 'function') {
                return this.onLoad(data);
            }
            throw new Error('ThreadMessageHandler.prototype.instantiate is not implemented');
        };
        /** @virtual */
        ThreadMessageHandler.prototype.handle = function (e) {
            var _this = this;
            var _a;
            if ((_a = e === null || e === void 0 ? void 0 : e.data) === null || _a === void 0 ? void 0 : _a.__emnapi__) {
                var type = e.data.__emnapi__.type;
                var payload_1 = e.data.__emnapi__.payload;
                try {
                    if (type === 'load') {
                        this._load(payload_1);
                    }
                    else if (type === 'start') {
                        this.handleAfterLoad(e, function () {
                            _this._start(payload_1);
                        });
                    }
                }
                catch (err) {
                    this.onError(err, type);
                }
            }
        };
        ThreadMessageHandler.prototype._load = function (payload) {
            var _this = this;
            if (this.instance !== undefined)
                return;
            var source;
            try {
                source = this.instantiate(payload);
            }
            catch (err) {
                this._loaded(err, null, payload);
                return;
            }
            var then = source && 'then' in source ? source.then : undefined;
            if (typeof then === 'function') {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                then.call(source, function (source) { _this._loaded(null, source, payload); }, function (err) { _this._loaded(err, null, payload); });
            }
            else {
                this._loaded(null, source, payload);
            }
        };
        ThreadMessageHandler.prototype._start = function (payload) {
            var wasi_thread_start = this.instance.exports.wasi_thread_start;
            if (typeof wasi_thread_start !== 'function') {
                var err = new TypeError('wasi_thread_start is not exported');
                notifyPthreadCreateResult(payload.sab, 2, err);
                throw err;
            }
            var postMessage = this.postMessage;
            var tid = payload.tid;
            var startArg = payload.arg;
            notifyPthreadCreateResult(payload.sab, 1);
            try {
                wasi_thread_start(tid, startArg);
            }
            catch (err) {
                if (err !== 'unwind') {
                    throw err;
                }
                else {
                    return;
                }
            }
            postMessage(createMessage('cleanup-thread', { tid: tid }));
        };
        ThreadMessageHandler.prototype._loaded = function (err, source, payload) {
            if (err) {
                notifyPthreadCreateResult(payload.sab, 2, err);
                throw err;
            }
            if (source == null) {
                var err_1 = new TypeError('onLoad should return an object');
                notifyPthreadCreateResult(payload.sab, 2, err_1);
                throw err_1;
            }
            var instance = source.instance;
            if (!instance) {
                var err_2 = new TypeError('onLoad should return an object which includes "instance"');
                notifyPthreadCreateResult(payload.sab, 2, err_2);
                throw err_2;
            }
            this.instance = instance;
            var postMessage = this.postMessage;
            postMessage(createMessage('loaded', {}));
            var messages = this.messagesBeforeLoad;
            this.messagesBeforeLoad = [];
            for (var i = 0; i < messages.length; i++) {
                var data = messages[i];
                this.handle({ data: data });
            }
        };
        ThreadMessageHandler.prototype.handleAfterLoad = function (e, f) {
            if (this.instance !== undefined) {
                f.call(this, e);
            }
            else {
                this.messagesBeforeLoad.push(e.data);
            }
        };
        return ThreadMessageHandler;
    }());
    function notifyPthreadCreateResult(sab, result, error) {
        if (sab) {
            serizeErrorToBuffer(sab.buffer, result, error);
            Atomics.notify(sab, 0);
        }
    }

    exports.ThreadManager = ThreadManager;
    exports.ThreadMessageHandler = ThreadMessageHandler;
    exports.WASIThreads = WASIThreads;
    exports.createInstanceProxy = createInstanceProxy;
    exports.isSharedArrayBuffer = isSharedArrayBuffer;
    exports.isTrapError = isTrapError;

}));
