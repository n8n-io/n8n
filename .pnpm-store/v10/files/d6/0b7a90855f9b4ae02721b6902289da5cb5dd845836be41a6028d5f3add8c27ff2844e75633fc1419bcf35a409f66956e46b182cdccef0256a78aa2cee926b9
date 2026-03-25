import * as Ast from './ast';
export { Ast };
export { parse, parse1 } from './parser';
/**
 * Convert a selector AST back to a string representation.
 *
 * Note: formatting is not preserved in the AST.
 *
 * @param selector - A selector AST object.
 */
export declare function serialize(selector: Ast.Selector): string;
/**
 * Modifies the given AST **in place** to have all internal arrays
 * in a stable order. Returns the AST.
 *
 * Intended for consistent processing and normalized `serialize()` output.
 *
 * @param selector - A selector AST object.
 */
export declare function normalize(selector: Ast.Selector): Ast.Selector;
/**
 * Compare selectors based on their specificity.
 *
 * Usable as a comparator for sorting.
 *
 * @param a - First selector.
 * @param b - Second selector.
 */
export declare function compareSelectors(a: Ast.SimpleSelector | Ast.CompoundSelector, b: Ast.SimpleSelector | Ast.CompoundSelector): number;
/**
 * Compare specificity values without reducing them
 * as arbitrary base numbers.
 *
 * Usable as a comparator for sorting.
 *
 * @param a - First specificity value.
 * @param b - Second specificity value.
 */
export declare function compareSpecificity(a: Ast.Specificity, b: Ast.Specificity): number;
