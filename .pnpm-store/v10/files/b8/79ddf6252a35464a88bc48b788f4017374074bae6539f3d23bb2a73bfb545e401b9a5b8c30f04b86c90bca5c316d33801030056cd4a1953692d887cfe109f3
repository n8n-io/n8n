"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
exports.sha1 = sha1;
const crypto_1 = require("crypto");
/**
 * @internal
 */
// stores hashes made out of only one argument being a string
exports.cache = Object.create(null);
/**
 * @internal
 */
function sha1(...data) {
    const canCache = data.length === 1 && typeof data[0] === 'string';
    // caching
    let cacheKey;
    if (canCache) {
        cacheKey = data[0];
        if (cacheKey in exports.cache) {
            return exports.cache[cacheKey];
        }
    }
    // we use SHA1 because it's the fastest provided by node
    // and we are not concerned about security here
    const hash = (0, crypto_1.createHash)('sha1');
    data.forEach((item) => {
        if (typeof item === 'string')
            hash.update(item, 'utf8');
        else
            hash.update(item);
    });
    const res = hash.digest('hex').toString();
    if (canCache) {
        exports.cache[cacheKey] = res;
    }
    return res;
}
