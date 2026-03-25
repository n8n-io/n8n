"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformSource = exports.getFormat = exports.load = exports.resolve = exports.lateBindHooks = void 0;
const esm_1 = require("../esm");
let hooks;
/** @internal */
function lateBindHooks(_hooks) {
    hooks = _hooks;
}
exports.lateBindHooks = lateBindHooks;
const proxy = {
    resolve(...args) {
        var _a;
        return ((_a = hooks === null || hooks === void 0 ? void 0 : hooks.resolve) !== null && _a !== void 0 ? _a : args[2])(...args);
    },
    load(...args) {
        var _a;
        return ((_a = hooks === null || hooks === void 0 ? void 0 : hooks.load) !== null && _a !== void 0 ? _a : args[2])(...args);
    },
    getFormat(...args) {
        var _a;
        return ((_a = hooks === null || hooks === void 0 ? void 0 : hooks.getFormat) !== null && _a !== void 0 ? _a : args[2])(...args);
    },
    transformSource(...args) {
        var _a;
        return ((_a = hooks === null || hooks === void 0 ? void 0 : hooks.transformSource) !== null && _a !== void 0 ? _a : args[2])(...args);
    },
};
/** @internal */
_a = (0, esm_1.filterHooksByAPIVersion)(proxy), exports.resolve = _a.resolve, exports.load = _a.load, exports.getFormat = _a.getFormat, exports.transformSource = _a.transformSource;
//# sourceMappingURL=child-loader.js.map