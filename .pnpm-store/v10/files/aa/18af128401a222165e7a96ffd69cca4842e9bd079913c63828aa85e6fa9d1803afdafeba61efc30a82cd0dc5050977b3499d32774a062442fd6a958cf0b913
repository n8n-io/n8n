"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeSetModuleExports = void 0;
var tslib_1 = require("tslib");
var types_1 = tslib_1.__importDefault(require("./types"));
function default_1(fork) {
    var types = fork.use(types_1.default);
    var Type = types.Type;
    var builtin = types.builtInTypes;
    var isNumber = builtin.number;
    // An example of constructing a new type with arbitrary constraints from
    // an existing type.
    function geq(than) {
        return Type.from(function (value) { return isNumber.check(value) && value >= than; }, isNumber + " >= " + than);
    }
    ;
    // Default value-returning functions that may optionally be passed as a
    // third argument to Def.prototype.field.
    var defaults = {
        // Functions were used because (among other reasons) that's the most
        // elegant way to allow for the emptyArray one always to give a new
        // array instance.
        "null": function () { return null; },
        "emptyArray": function () { return []; },
        "false": function () { return false; },
        "true": function () { return true; },
        "undefined": function () { },
        "use strict": function () { return "use strict"; }
    };
    var naiveIsPrimitive = Type.or(builtin.string, builtin.number, builtin.boolean, builtin.null, builtin.undefined);
    var isPrimitive = Type.from(function (value) {
        if (value === null)
            return true;
        var type = typeof value;
        if (type === "object" ||
            type === "function") {
            return false;
        }
        return true;
    }, naiveIsPrimitive.toString());
    return {
        geq: geq,
        defaults: defaults,
        isPrimitive: isPrimitive,
    };
}
exports.default = default_1;
;
// This function accepts a getter function that should return an object
// conforming to the NodeModule interface above. Typically, this means calling
// maybeSetModuleExports(() => module) at the very end of any module that has a
// default export, so the default export value can replace module.exports and
// thus CommonJS consumers can continue to rely on require("./that/module")
// returning the default-exported value, rather than always returning an exports
// object with a default property equal to that value. This function should help
// preserve backwards compatibility for CommonJS consumers, as a replacement for
// the ts-add-module-exports package.
function maybeSetModuleExports(moduleGetter) {
    try {
        var nodeModule = moduleGetter();
        var originalExports = nodeModule.exports;
        var defaultExport = originalExports["default"];
    }
    catch (_a) {
        // It's normal/acceptable for this code to throw a ReferenceError due to
        // the moduleGetter function attempting to access a non-existent global
        // `module` variable. That's the reason we use a getter function here:
        // so the calling code doesn't have to do its own typeof module ===
        // "object" checking (because it's always safe to pass `() => module` as
        // an argument, even when `module` is not defined in the calling scope).
        return;
    }
    if (defaultExport &&
        defaultExport !== originalExports &&
        typeof originalExports === "object") {
        // Make all properties found in originalExports properties of the
        // default export, including the default property itself, so that
        // require(nodeModule.id).default === require(nodeModule.id).
        Object.assign(defaultExport, originalExports, { "default": defaultExport });
        // Object.assign only transfers enumerable properties, and
        // __esModule is (and should remain) non-enumerable.
        if (originalExports.__esModule) {
            Object.defineProperty(defaultExport, "__esModule", { value: true });
        }
        // This line allows require(nodeModule.id) === defaultExport, rather
        // than (only) require(nodeModule.id).default === defaultExport.
        nodeModule.exports = defaultExport;
    }
}
exports.maybeSetModuleExports = maybeSetModuleExports;
//# sourceMappingURL=shared.js.map