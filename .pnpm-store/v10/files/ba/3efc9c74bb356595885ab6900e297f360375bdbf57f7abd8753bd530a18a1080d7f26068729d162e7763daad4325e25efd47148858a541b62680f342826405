"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
// This module is suitable for passing as options.parser when calling
// recast.parse to process JavaScript code with Acorn:
//
//   const ast = recast.parse(source, {
//     parser: require("recast/parsers/acorn")
//   });
//
var util_1 = require("../lib/util");
function parse(source, options) {
    var comments = [];
    var tokens = [];
    var ast = require("acorn").parse(source, {
        allowHashBang: true,
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        ecmaVersion: util_1.getOption(options, "ecmaVersion", 8),
        sourceType: util_1.getOption(options, "sourceType", "module"),
        locations: true,
        onComment: comments,
        onToken: tokens,
    });
    if (!ast.comments) {
        ast.comments = comments;
    }
    if (!ast.tokens) {
        ast.tokens = tokens;
    }
    return ast;
}
exports.parse = parse;
