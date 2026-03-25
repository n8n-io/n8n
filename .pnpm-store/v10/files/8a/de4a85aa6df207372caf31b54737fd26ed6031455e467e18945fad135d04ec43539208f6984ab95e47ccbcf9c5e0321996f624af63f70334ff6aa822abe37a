"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryStore = void 0;
const lru_cache_1 = require("lru-cache");
const lodash_clonedeep_1 = __importDefault(require("lodash.clonedeep"));
function clone(object) {
    if (typeof object === 'object' && object !== null) {
        return (0, lodash_clonedeep_1.default)(object);
    }
    return object;
}
/**
 * Wrapper for lru-cache.
 */
function memoryStore(args) {
    var _a;
    const shouldCloneBeforeSet = (args === null || args === void 0 ? void 0 : args.shouldCloneBeforeSet) !== false; // clone by default
    const isCacheable = (_a = args === null || args === void 0 ? void 0 : args.isCacheable) !== null && _a !== void 0 ? _a : ((val) => val !== undefined);
    const lruOpts = Object.assign(Object.assign({ ttlAutopurge: true }, args), { max: (args === null || args === void 0 ? void 0 : args.max) || 500, ttl: (args === null || args === void 0 ? void 0 : args.ttl) !== undefined ? args.ttl : 0 });
    const lruCache = new lru_cache_1.LRUCache(lruOpts);
    return {
        del(key) {
            return __awaiter(this, void 0, void 0, function* () {
                lruCache.delete(key);
            });
        },
        get: (key) => __awaiter(this, void 0, void 0, function* () { return lruCache.get(key); }),
        keys: () => __awaiter(this, void 0, void 0, function* () { return [...lruCache.keys()]; }),
        mget: (...args) => __awaiter(this, void 0, void 0, function* () { return args.map((x) => lruCache.get(x)); }),
        mset(args, ttl) {
            return __awaiter(this, void 0, void 0, function* () {
                const opt = { ttl: ttl !== undefined ? ttl : lruOpts.ttl };
                for (const [key, value] of args) {
                    if (!isCacheable(value))
                        throw new Error(`no cacheable value ${JSON.stringify(value)}`);
                    if (shouldCloneBeforeSet)
                        lruCache.set(key, clone(value), opt);
                    else
                        lruCache.set(key, value, opt);
                }
            });
        },
        mdel(...args) {
            return __awaiter(this, void 0, void 0, function* () {
                for (const key of args)
                    lruCache.delete(key);
            });
        },
        reset() {
            return __awaiter(this, void 0, void 0, function* () {
                lruCache.clear();
            });
        },
        ttl: (key) => __awaiter(this, void 0, void 0, function* () { return lruCache.getRemainingTTL(key); }),
        set(key, value, opt) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!isCacheable(value))
                    throw new Error(`no cacheable value ${JSON.stringify(value)}`);
                if (shouldCloneBeforeSet)
                    value = clone(value);
                const ttl = opt !== undefined ? opt : lruOpts.ttl;
                lruCache.set(key, value, { ttl });
            });
        },
        get calculatedSize() {
            return lruCache.calculatedSize;
        },
        /**
         * This method is not available in the caching modules.
         */
        get size() {
            return lruCache.size;
        },
        /**
         * This method is not available in the caching modules.
         */
        dump: () => lruCache.dump(),
        /**
         * This method is not available in the caching modules.
         */
        load: (...args) => lruCache.load(...args),
    };
}
exports.memoryStore = memoryStore;
//# sourceMappingURL=memory.js.map