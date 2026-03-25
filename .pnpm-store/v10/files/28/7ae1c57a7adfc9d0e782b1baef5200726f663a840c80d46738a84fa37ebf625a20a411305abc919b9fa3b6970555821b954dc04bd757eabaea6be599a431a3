"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.parser = void 0;
var tslib_1 = require("tslib");
var babel_1 = require("./babel");
Object.defineProperty(exports, "parser", { enumerable: true, get: function () { return babel_1.parser; } });
var _babel_options_1 = tslib_1.__importDefault(require("./_babel_options"));
function parse(source, options) {
    var babelOptions = _babel_options_1.default(options);
    babelOptions.plugins.push("jsx", "typescript");
    return babel_1.parser.parse(source, babelOptions);
}
exports.parse = parse;
