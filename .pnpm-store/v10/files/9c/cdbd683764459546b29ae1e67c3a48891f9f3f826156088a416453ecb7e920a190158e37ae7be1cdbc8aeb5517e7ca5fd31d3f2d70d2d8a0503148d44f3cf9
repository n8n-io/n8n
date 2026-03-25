import type { CompiledQuery, Options, Query, Adapter } from "./types.js";
export type { Options };
/**
 * Compiles the query, returns a function.
 */
export declare const compile: <Node, ElementNode extends Node>(selector: string | import("css-what").Selector[][], options?: Options<Node, ElementNode> | undefined, context?: Node | Node[] | undefined) => CompiledQuery<Node>;
export declare const _compileUnsafe: <Node, ElementNode extends Node>(selector: string | import("css-what").Selector[][], options?: Options<Node, ElementNode> | undefined, context?: Node | Node[] | undefined) => CompiledQuery<ElementNode>;
export declare const _compileToken: <Node, ElementNode extends Node>(selector: import("./types.js").InternalSelector[][], options?: Options<Node, ElementNode> | undefined, context?: Node | Node[] | undefined) => CompiledQuery<ElementNode>;
export declare function prepareContext<Node, ElementNode extends Node>(elems: Node | Node[], adapter: Adapter<Node, ElementNode>, shouldTestNextSiblings?: boolean): Node[];
/**
 * @template Node The generic Node type for the DOM adapter being used.
 * @template ElementNode The Node type for elements for the DOM adapter being used.
 * @param elems Elements to query. If it is an element, its children will be queried..
 * @param query can be either a CSS selector string or a compiled query function.
 * @param [options] options for querying the document.
 * @see compile for supported selector queries.
 * @returns All matching elements.
 *
 */
export declare const selectAll: <Node, ElementNode extends Node>(query: Query<ElementNode>, elements: Node | Node[], options?: Options<Node, ElementNode> | undefined) => ElementNode[];
/**
 * @template Node The generic Node type for the DOM adapter being used.
 * @template ElementNode The Node type for elements for the DOM adapter being used.
 * @param elems Elements to query. If it is an element, its children will be queried..
 * @param query can be either a CSS selector string or a compiled query function.
 * @param [options] options for querying the document.
 * @see compile for supported selector queries.
 * @returns the first match, or null if there was no match.
 */
export declare const selectOne: <Node, ElementNode extends Node>(query: Query<ElementNode>, elements: Node | Node[], options?: Options<Node, ElementNode> | undefined) => ElementNode | null;
/**
 * Tests whether or not an element is matched by query.
 *
 * @template Node The generic Node type for the DOM adapter being used.
 * @template ElementNode The Node type for elements for the DOM adapter being used.
 * @param elem The element to test if it matches the query.
 * @param query can be either a CSS selector string or a compiled query function.
 * @param [options] options for querying the document.
 * @see compile for supported selector queries.
 * @returns
 */
export declare function is<Node, ElementNode extends Node>(elem: ElementNode, query: Query<ElementNode>, options?: Options<Node, ElementNode>): boolean;
/**
 * Alias for selectAll(query, elems, options).
 * @see [compile] for supported selector queries.
 */
export default selectAll;
/** @deprecated Use the `pseudos` option instead. */
export { filters, pseudos, aliases } from "./pseudo-selectors/index.js";
//# sourceMappingURL=index.d.ts.map