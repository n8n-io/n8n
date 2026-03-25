"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.parser = void 0;
var tslib_1 = require("tslib");
var _babel_options_1 = tslib_1.__importDefault(require("./_babel_options"));
// Prefer the new @babel/parser package, but fall back to babylon if
// that's what's available.
exports.parser = (function () {
    try {
        return require("@babel/parser");
    }
    catch (_a) {
        try {
            return require("babylon");
        }
        catch (_b) {
            throw new Error("Install @babel/parser to use the `typescript`, `flow`, or `babel` parsers");
        }
    }
})();
// This module is suitable for passing as options.parser when calling
// recast.parse to process JavaScript code with Babel:
//
//   const ast = recast.parse(source, {
//     parser: require("recast/parsers/babel")
//   });
//
function parse(source, options) {
    var babelOptions = _babel_options_1.default(options);
    babelOptions.plugins.push("jsx", "flow");
    return exports.parser.parse(source, babelOptions);
}
exports.parse = parse;
