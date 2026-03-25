"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "hasContentChanged", {
    enumerable: true,
    get: function() {
        return hasContentChanged;
    }
});
const _crypto = /*#__PURE__*/ _interop_require_default(require("crypto"));
const _sharedState = /*#__PURE__*/ _interop_require_wildcard(require("./sharedState"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
/**
 * Calculate the hash of a string.
 *
 * This doesn't need to be cryptographically secure or
 * anything like that since it's used only to detect
 * when the CSS changes to invalidate the context.
 *
 * This is wrapped in a try/catch because it's really dependent
 * on how Node itself is build and the environment and OpenSSL
 * version / build that is installed on the user's machine.
 *
 * Based on the environment this can just outright fail.
 *
 * See https://github.com/nodejs/node/issues/40455
 *
 * @param {string} str
 */ function getHash(str) {
    try {
        return _crypto.default.createHash("md5").update(str, "utf-8").digest("binary");
    } catch (err) {
        return "";
    }
}
function hasContentChanged(sourcePath, root) {
    let css = root.toString();
    // We only care about files with @tailwind directives
    // Other files use an existing context
    if (!css.includes("@tailwind")) {
        return false;
    }
    let existingHash = _sharedState.sourceHashMap.get(sourcePath);
    let rootHash = getHash(css);
    let didChange = existingHash !== rootHash;
    _sharedState.sourceHashMap.set(sourcePath, rootHash);
    return didChange;
}
