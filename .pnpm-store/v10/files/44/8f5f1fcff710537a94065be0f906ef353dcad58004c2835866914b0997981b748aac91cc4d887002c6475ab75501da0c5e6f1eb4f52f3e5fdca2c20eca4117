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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncMemoizer = void 0;
var lru_cache_1 = __importDefault(require("lru-cache"));
var events_1 = require("events");
var lodash_clonedeep_1 = __importDefault(require("lodash.clonedeep"));
var freeze_1 = require("./freeze");
function syncMemoizer(options) {
    var cache = new lru_cache_1.default(options);
    var load = options.load;
    var hash = options.hash;
    var bypass = options.bypass;
    var itemMaxAge = options.itemMaxAge;
    var freeze = options.freeze;
    var clone = options.clone;
    var emitter = new events_1.EventEmitter();
    var defaultResult = Object.assign({
        del: del,
        reset: function () { return cache.reset(); },
        keys: cache.keys.bind(cache),
        on: emitter.on.bind(emitter),
        once: emitter.once.bind(emitter),
    }, options);
    if (options.disable) {
        return Object.assign(load, defaultResult);
    }
    function del() {
        var key = hash.apply(void 0, __spread(arguments));
        cache.del(key);
    }
    function emit(event) {
        var parameters = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            parameters[_i - 1] = arguments[_i];
        }
        emitter.emit.apply(emitter, __spread([event], parameters));
    }
    function isPromise(result) {
        // detect native, bluebird, A+ promises
        return result && result.then && typeof result.then === 'function';
    }
    function processResult(result) {
        var res = result;
        if (clone) {
            if (isPromise(res)) {
                res = res.then(lodash_clonedeep_1.default);
            }
            else {
                res = lodash_clonedeep_1.default(res);
            }
        }
        if (freeze) {
            if (isPromise(res)) {
                res = res.then(freeze_1.deepFreeze);
            }
            else {
                freeze_1.deepFreeze(res);
            }
        }
        return res;
    }
    var result = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (bypass && bypass.apply(void 0, __spread(args))) {
            emit.apply(void 0, __spread(['miss'], args));
            return load.apply(void 0, __spread(args));
        }
        var key = hash.apply(void 0, __spread(args));
        var fromCache = cache.get(key);
        if (fromCache) {
            emit.apply(void 0, __spread(['hit'], args));
            return processResult(fromCache);
        }
        emit.apply(void 0, __spread(['miss'], args));
        var result = load.apply(void 0, __spread(args));
        if (itemMaxAge) {
            // @ts-ignore
            cache.set(key, result, itemMaxAge.apply(void 0, __spread(args.concat([result]))));
        }
        else {
            cache.set(key, result);
        }
        return processResult(result);
    };
    return Object.assign(result, defaultResult);
}
exports.syncMemoizer = syncMemoizer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9zeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0RBQTRCO0FBQzVCLGlDQUFzQztBQUN0QyxzRUFBeUM7QUFDekMsbUNBQXNDO0FBaUd0QyxTQUFnQixZQUFZLENBQzFCLE9BQWdDO0lBRWhDLElBQU0sS0FBSyxHQUFRLElBQUksbUJBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwQyxJQUFNLElBQUksR0FBUyxPQUFPLENBQUMsSUFBSSxDQUFDO0lBQ2hDLElBQU0sSUFBSSxHQUFTLE9BQU8sQ0FBQyxJQUFJLENBQUM7SUFDaEMsSUFBTSxNQUFNLEdBQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQztJQUNsQyxJQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO0lBQ3RDLElBQU0sTUFBTSxHQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDbEMsSUFBTSxLQUFLLEdBQVEsT0FBTyxDQUFDLEtBQUssQ0FBQztJQUNqQyxJQUFNLE9BQU8sR0FBTSxJQUFJLHFCQUFZLEVBQUUsQ0FBQztJQUV0QyxJQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ2xDLEdBQUcsS0FBQTtRQUNILEtBQUssRUFBRSxjQUFNLE9BQUEsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFiLENBQWE7UUFDMUIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUM1QixFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzVCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7S0FDakMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUVaLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtRQUNuQixPQUFPLE1BQU0sQ0FB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