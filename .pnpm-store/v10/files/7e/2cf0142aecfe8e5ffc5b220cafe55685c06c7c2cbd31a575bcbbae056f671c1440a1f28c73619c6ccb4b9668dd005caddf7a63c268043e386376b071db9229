"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return resolveConfig;
    }
});
const _resolveConfig = /*#__PURE__*/ _interop_require_default(require("../util/resolveConfig"));
const _getAllConfigs = /*#__PURE__*/ _interop_require_default(require("../util/getAllConfigs"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function resolveConfig(...configs) {
    let [, ...defaultConfigs] = (0, _getAllConfigs.default)(configs[0]);
    return (0, _resolveConfig.default)([
        ...configs,
        ...defaultConfigs
    ]);
}
