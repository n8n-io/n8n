"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
// This module is suitable for passing as options.parser when calling
// recast.parse to process ECMAScript code with Esprima:
//
//   const ast = recast.parse(source, {
//     parser: require("recast/parsers/esprima")
//   });
//
var util_1 = require("../lib/util");
function parse(source, options) {
    var comments = [];
    var ast = require("esprima").parse(source, {
        loc: true,
        locations: true,
        comment: true,
        onComment: comments,
        range: (0, util_1.getOption)(options, "range", false),
        tolerant: (0, util_1.getOption)(options, "tolerant", true),
        tokens: true,
        jsx: (0, util_1.getOption)(options, "jsx", false),
        sourceType: (0, util_1.getOption)(options, "sourceType", "module"),
    });
    if (!Array.isArray(ast.comments)) {
        ast.comments = comments;
    }
    return ast;
}
exports.parse = parse;
