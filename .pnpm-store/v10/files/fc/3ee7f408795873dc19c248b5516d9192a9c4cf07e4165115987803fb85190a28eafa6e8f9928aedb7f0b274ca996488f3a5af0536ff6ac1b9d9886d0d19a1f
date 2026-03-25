"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha1 = exports.cache = void 0;
var crypto_1 = require("crypto");
/**
 * @internal
 */
// stores hashes made out of only one argument being a string
exports.cache = Object.create(null);
/**
 * @internal
 */
function sha1() {
    var data = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        data[_i] = arguments[_i];
    }
    var canCache = data.length === 1 && typeof data[0] === 'string';
    // caching
    var cacheKey;
    if (canCache) {
        cacheKey = data[0];
        if (cacheKey in exports.cache) {
            return exports.cache[cacheKey];
        }
    }
    // we use SHA1 because it's the fastest provided by node
    // and we are not concerned about security here
    var hash = (0, crypto_1.createHash)('sha1');
    data.forEach(function (item) {
        if (typeof item === 'string')
            hash.update(item, 'utf8');
        else
            hash.update(item);
    });
    var res = hash.digest('hex').toString();
    if (canCache) {
        exports.cache[cacheKey] = res;
    }
    return res;
}
exports.sha1 = sha1;
