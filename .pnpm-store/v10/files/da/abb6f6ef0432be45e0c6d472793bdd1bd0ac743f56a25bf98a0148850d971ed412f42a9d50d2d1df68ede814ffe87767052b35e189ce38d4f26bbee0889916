/// <reference types="node" />
import { CheerioOptions, InternalOptions } from './options.js';
import * as staticMethods from './static.js';
import { Cheerio } from './cheerio.js';
import type { AnyNode, Document, Element } from 'domhandler';
import type { SelectorType, BasicAcceptedElems } from './types.js';
declare type StaticType = typeof staticMethods;
/**
 * A querying function, bound to a document created from the provided markup.
 *
 * Also provides several helper methods for dealing with the document as a whole.
 */
export interface CheerioAPI extends StaticType {
    /**
     * This selector method is the starting point for traversing and manipulating
     * the document. Like jQuery, it's the primary method for selecting elements
     * in the document.
     *
     * `selector` searches within the `context` scope which searches within the
     * `root` scope.
     *
     * @example
     *
     * ```js
     * $('.apple', '#fruits').text();
     * //=> Apple
     *
     * $('ul .pear').attr('class');
     * //=> pear
     *
     * $('li[class=orange]').html();
     * //=> Orange
     * ```
     *
     * @param selector - Either a selector to look for within the document, or the
     *   contents of a new Cheerio instance.
     * @param context - Either a selector to look for within the root, or the
     *   contents of the document to query.
     * @param root - Optional HTML document string.
     */
    <T extends AnyNode, S extends string>(selector?: S | BasicAcceptedElems<T>, context?: BasicAcceptedElems<AnyNode> | null, root?: BasicAcceptedElems<Document>, options?: CheerioOptions): Cheerio<S extends SelectorType ? Element : T>;
    /**
     * The root the document was originally loaded with.
     *
     * @private
     */
    _root: Document;
    /**
     * The options the document was originally loaded with.
     *
     * @private
     */
    _options: InternalOptions;
    /** Mimic jQuery's prototype alias for plugin authors. */
    fn: typeof Cheerio.prototype;
    load: ReturnType<typeof getLoad>;
}
export declare function getLoad(parse: typeof Cheerio.prototype._parse, render: (dom: AnyNode | ArrayLike<AnyNode>, options: InternalOptions) => string): (content: string | AnyNode | AnyNode[] | Buffer, options?: CheerioOptions | null, isDocument?: boolean) => CheerioAPI;
export {};
//# sourceMappingURL=load.d.ts.map