"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.prettyPrint = exports.print = exports.visit = exports.types = exports.parse = void 0;
var tslib_1 = require("tslib");
var fs_1 = tslib_1.__importDefault(require("fs"));
var types = tslib_1.__importStar(require("ast-types"));
exports.types = types;
var parser_1 = require("./lib/parser");
Object.defineProperty(exports, "parse", { enumerable: true, get: function () { return parser_1.parse; } });
var printer_1 = require("./lib/printer");
/**
 * Traverse and potentially modify an abstract syntax tree using a
 * convenient visitor syntax:
 *
 *   recast.visit(ast, {
 *     names: [],
 *     visitIdentifier: function(path) {
 *       var node = path.value;
 *       this.visitor.names.push(node.name);
 *       this.traverse(path);
 *     }
 *   });
 */
var ast_types_1 = require("ast-types");
Object.defineProperty(exports, "visit", { enumerable: true, get: function () { return ast_types_1.visit; } });
/**
 * Reprint a modified syntax tree using as much of the original source
 * code as possible.
 */
function print(node, options) {
    return new printer_1.Printer(options).print(node);
}
exports.print = print;
/**
 * Print without attempting to reuse any original source code.
 */
function prettyPrint(node, options) {
    return new printer_1.Printer(options).printGenerically(node);
}
exports.prettyPrint = prettyPrint;
/**
 * Convenient command-line interface (see e.g. example/add-braces).
 */
function run(transformer, options) {
    return runFile(process.argv[2], transformer, options);
}
exports.run = run;
function runFile(path, transformer, options) {
    fs_1.default.readFile(path, "utf-8", function (err, code) {
        if (err) {
            console.error(err);
            return;
        }
        runString(code, transformer, options);
    });
}
function defaultWriteback(output) {
    process.stdout.write(output);
}
function runString(code, transformer, options) {
    var writeback = (options && options.writeback) || defaultWriteback;
    transformer(parser_1.parse(code, options), function (node) {
        writeback(print(node, options).code);
    });
}
