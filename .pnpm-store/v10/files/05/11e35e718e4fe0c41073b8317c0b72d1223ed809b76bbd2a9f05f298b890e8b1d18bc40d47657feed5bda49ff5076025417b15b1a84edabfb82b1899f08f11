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
Object.defineProperty(exports, "__esModule", { value: true });
exports.caching = void 0;
const stores_1 = require("./stores");
/**
 * Generic caching interface that wraps any caching library with a compatible interface.
 */
function caching(factory, args) {
    return __awaiter(this, void 0, void 0, function* () {
        let store;
        if (factory === 'memory')
            store = (0, stores_1.memoryStore)(args);
        else if (typeof factory === 'function')
            store = yield factory(args);
        else
            store = factory;
        return {
            /**
             * Wraps a function in cache. I.e., the first time the function is run,
             * its results are stored in cache so subsequent calls retrieve from cache
             * instead of calling the function.
        
             * @example
             * const result = await cache.wrap('key', () => Promise.resolve(1));
             *
             */
            wrap: (key, fn, ttl) => __awaiter(this, void 0, void 0, function* () {
                const value = yield store.get(key);
                if (value === undefined) {
                    const result = yield fn();
                    yield store.set(key, result, ttl);
                    return result;
                }
                return value;
            }),
            store: store,
            del: (key) => store.del(key),
            get: (key) => store.get(key),
            set: (key, value, ttl) => store.set(key, value, ttl),
            reset: () => store.reset(),
        };
    });
}
exports.caching = caching;
//# sourceMappingURL=caching.js.map