"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return responsive;
    }
});
const _postcss = /*#__PURE__*/ _interop_require_default(require("postcss"));
const _cloneNodes = /*#__PURE__*/ _interop_require_default(require("./cloneNodes"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function responsive(rules) {
    return _postcss.default.atRule({
        name: "responsive"
    }).append((0, _cloneNodes.default)(Array.isArray(rules) ? rules : [
        rules
    ]));
}
