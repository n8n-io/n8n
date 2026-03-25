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
exports.multiCaching = void 0;
/**
 * Module that lets you specify a hierarchy of caches.
 */
function multiCaching(caches) {
    const get = (key) => __awaiter(this, void 0, void 0, function* () {
        for (const cache of caches) {
            try {
                const val = yield cache.get(key);
                if (val !== undefined)
                    return val;
            }
            catch (e) { }
        }
    });
    const set = (key, data, ttl) => __awaiter(this, void 0, void 0, function* () {
        yield Promise.all(caches.map((cache) => cache.set(key, data, ttl)));
    });
    return {
        get,
        set,
        del: (key) => __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(caches.map((cache) => cache.del(key)));
        }),
        wrap(key, fn, ttl) {
            return __awaiter(this, void 0, void 0, function* () {
                let value;
                let i = 0;
                for (; i < caches.length; i++) {
                    try {
                        value = yield caches[i].get(key);
                        if (value !== undefined)
                            break;
                    }
                    catch (e) { }
                }
                if (value === undefined) {
                    const result = yield fn();
                    yield set(key, result, ttl);
                    return result;
                }
                else {
                    yield Promise.all(caches.slice(0, i).map((cache) => cache.set(key, value, ttl)));
                }
                return value;
            });
        },
        reset: () => __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(caches.map((x) => x.reset()));
        }),
        mget: (...keys) => __awaiter(this, void 0, void 0, function* () {
            const values = new Array(keys.length).fill(undefined);
            for (const cache of caches) {
                if (values.every((x) => x !== undefined))
                    break;
                try {
                    const val = yield cache.store.mget(...keys);
                    val.forEach((v, i) => {
                        if (values[i] === undefined && v !== undefined)
                            values[i] = v;
                    });
                }
                catch (e) { }
            }
            return values;
        }),
        mset: (args, ttl) => __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(caches.map((cache) => cache.store.mset(args, ttl)));
        }),
        mdel: (...keys) => __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(caches.map((cache) => cache.store.mdel(...keys)));
        }),
    };
}
exports.multiCaching = multiCaching;
//# sourceMappingURL=multi-caching.js.map