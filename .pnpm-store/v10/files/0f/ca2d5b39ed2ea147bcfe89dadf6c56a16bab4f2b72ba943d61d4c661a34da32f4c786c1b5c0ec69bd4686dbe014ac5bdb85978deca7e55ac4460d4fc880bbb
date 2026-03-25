"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncMemoizer = void 0;
var lru_cache_1 = __importDefault(require("lru-cache"));
var events_1 = require("events");
var lodash_clonedeep_1 = __importDefault(require("lodash.clonedeep"));
var freeze_1 = require("./freeze");
var sync_1 = require("./sync");
function asyncMemoizer(options) {
    var cache = new lru_cache_1.default(options);
    var load = options.load;
    var hash = options.hash;
    var bypass = options.bypass;
    var itemMaxAge = options.itemMaxAge;
    var freeze = options.freeze;
    var clone = options.clone;
    var queueMaxAge = options.queueMaxAge || 1000;
    var loading = new Map();
    var emitter = new events_1.EventEmitter();
    var memoizerMethods = Object.assign({
        del: del,
        reset: function () { return cache.reset(); },
        keys: cache.keys.bind(cache),
        on: emitter.on.bind(emitter),
        once: emitter.once.bind(emitter)
    }, options);
    if (options.disable) {
        return Object.assign(load, memoizerMethods);
    }
    function del() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var key = hash.apply(void 0, __spread(args));
        cache.del(key);
    }
    function add(key, parameters, result) {
        if (freeze) {
            result.forEach(freeze_1.deepFreeze);
        }
        if (itemMaxAge) {
            cache.set(key, result, itemMaxAge.apply(void 0, __spread(parameters.concat(result))));
        }
        else {
            cache.set(key, result);
        }
    }
    function runCallbacks(callbacks, args) {
        var e_1, _a;
        try {
            for (var callbacks_1 = __values(callbacks), callbacks_1_1 = callbacks_1.next(); !callbacks_1_1.done; callbacks_1_1 = callbacks_1.next()) {
                var callback = callbacks_1_1.value;
                // Simulate async call when returning from cache
                // and yield between callback resolution
                if (clone) {
                    setImmediate.apply(void 0, __spread([callback], args.map(lodash_clonedeep_1.default)));
                }
                else {
                    setImmediate.apply(void 0, __spread([callback], args));
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (callbacks_1_1 && !callbacks_1_1.done && (_a = callbacks_1.return)) _a.call(callbacks_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    function emit(event) {
        var parameters = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            parameters[_i - 1] = arguments[_i];
        }
        emitter.emit.apply(emitter, __spread([event], parameters));
    }
    function memoizedFunction() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var parameters = args.slice(0, -1);
        var callback = args.slice(-1).pop();
        var key;
        if (bypass && bypass.apply(void 0, __spread(parameters))) {
            emit.apply(void 0, __spread(['miss'], parameters));
            return load.apply(void 0, __spread(args));
        }
        if (parameters.length === 0 && !hash) {
            //the load function only receives callback.
            key = '_';
        }
        else {
            key = hash.apply(void 0, __spread(parameters));
        }
        var fromCache = cache.get(key);
        if (fromCache) {
            emit.apply(void 0, __spread(['hit'], parameters));
            // found, invoke callback
            return runCallbacks([callback], [null].concat(fromCache));
        }
        var pendingLoad = loading.get(key);
        if (pendingLoad && pendingLoad.expiresAt > Date.now()) {
            // request already in progress, queue and return
            pendingLoad.queue.push(callback);
            emit.apply(void 0, __spread(['queue'], parameters));
            return;
        }
        emit.apply(void 0, __spread(['miss'], parameters));
        var started = Date.now();
        // no pending request or not resolved before expiration
        // create a new queue and invoke load
        var queue = [callback];
        loading.set(key, {
            queue: queue,
            expiresAt: started + queueMaxAge
        });
        var loadHandler = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var err = args[0];
            if (!err) {
                add(key, parameters, args.slice(1));
            }
            // this can potentially delete a different queue than `queue` if
            // this callback was called after expiration.
            // that will only cause a new call to be performed and a new queue to be
            // created
            loading.delete(key);
            emit.apply(void 0, __spread(['loaded', Date.now() - started], parameters));
            runCallbacks(queue, args);
        };
        load.apply(void 0, __spread(parameters, [loadHandler]));
    }
    ;
    return Object.assign(memoizedFunction, memoizerMethods);
}
exports.asyncMemoizer = asyncMemoizer;
asyncMemoizer.sync = sync_1.syncMemoizer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYXN5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdEQUE0QjtBQUM1QixpQ0FBc0M7QUFDdEMsc0VBQXlDO0FBQ3pDLG1DQUFzQztBQUN0QywrQkFBc0M7QUE2R3RDLFNBQVMsYUFBYSxDQUNwQixPQUF3QjtJQUV4QixJQUFNLEtBQUssR0FBUSxJQUFJLG1CQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDcEMsSUFBTSxJQUFJLEdBQVMsT0FBTyxDQUFDLElBQUksQ0FBQztJQUNoQyxJQUFNLElBQUksR0FBUyxPQUFPLENBQUMsSUFBSSxDQUFDO0lBQ2hDLElBQU0sTUFBTSxHQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDbEMsSUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztJQUN0QyxJQUFNLE1BQU0sR0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDO0lBQ2xDLElBQU0sS0FBSyxHQUFRLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFDakMsSUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUM7SUFDaEQsSUFBTSxPQUFPLEdBQU0sSUFBSSxHQUFHLEVBQXVCLENBQUM7SUFDbEQsSUFBTSxPQUFPLEdBQU0sSUFBSSxxQkFBWSxFQUFFLENBQUM7SUFFdEMsSUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUNwQyxHQUFHLEtBQUE7UUFDSCxLQUFLLEVBQUUsY0FBTSxPQUFBLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBYixDQUFhO1FBQzFCLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDNUIsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM1QixJQUFJLEVB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