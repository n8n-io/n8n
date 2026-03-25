"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "parseGlob", {
    enumerable: true,
    get: function() {
        return parseGlob;
    }
});
const _globparent = /*#__PURE__*/ _interop_require_default(require("glob-parent"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function parseGlob(pattern) {
    let glob = pattern;
    let base = (0, _globparent.default)(pattern);
    if (base !== ".") {
        glob = pattern.substr(base.length);
        if (glob.charAt(0) === "/") {
            glob = glob.substr(1);
        }
    }
    if (glob.substr(0, 2) === "./") {
        glob = glob.substr(2);
    }
    if (glob.charAt(0) === "/") {
        glob = glob.substr(1);
    }
    return {
        base,
        glob
    };
}
