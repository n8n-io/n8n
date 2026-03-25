import type { BasicAcceptedElems } from './types.js';
import type { CheerioAPI } from './load.js';
import type { Cheerio } from './cheerio.js';
import type { AnyNode, Document } from 'domhandler';
import { type CheerioOptions } from './options.js';
import type { ExtractedMap, ExtractMap } from './api/extract.js';
/**
 * Renders the document.
 *
 * @category Static
 * @param options - Options for the renderer.
 * @returns The rendered document.
 */
export declare function html(this: CheerioAPI, options?: CheerioOptions): string;
/**
 * Renders the document.
 *
 * @category Static
 * @param dom - Element to render.
 * @param options - Options for the renderer.
 * @returns The rendered document.
 */
export declare function html(this: CheerioAPI, dom?: BasicAcceptedElems<AnyNode>, options?: CheerioOptions): string;
/**
 * Render the document as XML.
 *
 * @category Static
 * @param dom - Element to render.
 * @returns THe rendered document.
 */
export declare function xml(this: CheerioAPI, dom?: BasicAcceptedElems<AnyNode>): string;
/**
 * Render the document as text.
 *
 * This returns the `textContent` of the passed elements. The result will
 * include the contents of `<script>` and `<style>` elements. To avoid this, use
 * `.prop('innerText')` instead.
 *
 * @category Static
 * @param elements - Elements to render.
 * @returns The rendered document.
 */
export declare function text(this: CheerioAPI | void, elements?: ArrayLike<AnyNode>): string;
/**
 * Parses a string into an array of DOM nodes. The `context` argument has no
 * meaning for Cheerio, but it is maintained for API compatibility with jQuery.
 *
 * @category Static
 * @param data - Markup that will be parsed.
 * @param context - Will be ignored. If it is a boolean it will be used as the
 *   value of `keepScripts`.
 * @param keepScripts - If false all scripts will be removed.
 * @returns The parsed DOM.
 * @alias Cheerio.parseHTML
 * @see {@link https://api.jquery.com/jQuery.parseHTML/}
 */
export declare function parseHTML(this: CheerioAPI, data: string, context?: unknown | boolean, keepScripts?: boolean): AnyNode[];
export declare function parseHTML(this: CheerioAPI, data?: '' | null): null;
/**
 * Sometimes you need to work with the top-level root element. To query it, you
 * can use `$.root()`.
 *
 * @category Static
 * @example
 *
 * ```js
 * $.root().append('<ul id="vegetables"></ul>').html();
 * //=> <ul id="fruits">...</ul><ul id="vegetables"></ul>
 * ```
 *
 * @returns Cheerio instance wrapping the root node.
 * @alias Cheerio.root
 */
export declare function root(this: CheerioAPI): Cheerio<Document>;
/**
 * Checks to see if the `contained` DOM element is a descendant of the
 * `container` DOM element.
 *
 * @category Static
 * @param container - Potential parent node.
 * @param contained - Potential child node.
 * @returns Indicates if the nodes contain one another.
 * @alias Cheerio.contains
 * @see {@link https://api.jquery.com/jQuery.contains/}
 */
export declare function contains(container: AnyNode, contained: AnyNode): boolean;
/**
 * Extract multiple values from a document, and store them in an object.
 *
 * @category Static
 * @param map - An object containing key-value pairs. The keys are the names of
 *   the properties to be created on the object, and the values are the
 *   selectors to be used to extract the values.
 * @returns An object containing the extracted values.
 */
export declare function extract<M extends ExtractMap>(this: CheerioAPI, map: M): ExtractedMap<M>;
type Writable<T> = {
    -readonly [P in keyof T]: T[P];
};
/**
 * $.merge().
 *
 * @category Static
 * @param arr1 - First array.
 * @param arr2 - Second array.
 * @returns `arr1`, with elements of `arr2` inserted.
 * @alias Cheerio.merge
 * @see {@link https://api.jquery.com/jQuery.merge/}
 */
export declare function merge<T>(arr1: Writable<ArrayLike<T>>, arr2: ArrayLike<T>): ArrayLike<T> | undefined;
export {};
//# sourceMappingURL=static.d.ts.map