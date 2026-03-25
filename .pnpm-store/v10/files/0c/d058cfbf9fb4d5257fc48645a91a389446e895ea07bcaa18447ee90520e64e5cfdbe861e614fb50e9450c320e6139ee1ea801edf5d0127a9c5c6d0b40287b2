"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lru_cache_1 = __importDefault(require("lru-cache"));
var hash_sum_1 = __importDefault(require("hash-sum"));
var cache = new lru_cache_1.default({ max: 250 });
function default_1(creator) {
    var argsKey = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        argsKey[_i - 1] = arguments[_i];
    }
    var cacheKey = (0, hash_sum_1.default)(argsKey.join(''));
    // source-map cache busting for hot-reloadded modules
    var output = cache.get(cacheKey);
    if (output) {
        return output;
    }
    output = creator();
    cache.set(cacheKey, output);
    return output;
}
exports.default = default_1;
