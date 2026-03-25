import * as types from "ast-types";
import { parse } from "./lib/parser";
import { Options } from "./lib/options";
export { 
/**
 * Parse a string of code into an augmented syntax tree suitable for
 * arbitrary modification and reprinting.
 */
parse, 
/**
 * Convenient shorthand for the ast-types package.
 */
types, };
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
export { visit } from "ast-types";
/**
 * Options shared between parsing and printing.
 */
export { Options } from "./lib/options";
/**
 * Reprint a modified syntax tree using as much of the original source
 * code as possible.
 */
export declare function print(node: types.ASTNode, options?: Options): import("./lib/printer").PrintResultType;
/**
 * Print without attempting to reuse any original source code.
 */
export declare function prettyPrint(node: types.ASTNode, options?: Options): import("./lib/printer").PrintResultType;
/**
 * Convenient command-line interface (see e.g. example/add-braces).
 */
export declare function run(transformer: Transformer, options?: RunOptions): void;
export interface Transformer {
    (ast: types.ASTNode, callback: (ast: types.ASTNode) => void): void;
}
export interface RunOptions extends Options {
    writeback?(code: string): void;
}
