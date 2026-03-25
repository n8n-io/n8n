"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
var tslib_1 = require("tslib");
var babel_1 = require("./babel");
var _babel_options_1 = tslib_1.__importDefault(require("./_babel_options"));
// This module is suitable for passing as options.parser when calling
// recast.parse to process TypeScript code:
//
//   const ast = recast.parse(source, {
//     parser: require("recast/parsers/typescript")
//   });
//
function parse(source, options) {
    var babelOptions = (0, _babel_options_1.default)(options);
    babelOptions.plugins.push("typescript");
    return babel_1.parser.parse(source, babelOptions);
}
exports.parse = parse;
