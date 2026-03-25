/// <reference types="node" />
import type { InternalOptions } from './options.js';
import type { AnyNode, Document, ParentNode } from 'domhandler';
import type { BasicAcceptedElems } from './types.js';
import * as Attributes from './api/attributes.js';
import * as Traversing from './api/traversing.js';
import * as Manipulation from './api/manipulation.js';
import * as Css from './api/css.js';
import * as Forms from './api/forms.js';
declare type AttributesType = typeof Attributes;
declare type TraversingType = typeof Traversing;
declare type ManipulationType = typeof Manipulation;
declare type CssType = typeof Css;
declare type FormsType = typeof Forms;
export declare abstract class Cheerio<T> implements ArrayLike<T> {
    length: number;
    [index: number]: T;
    options: InternalOptions;
    /**
     * The root of the document. Can be set by using the `root` argument of the constructor.
     *
     * @private
     */
    _root: Cheerio<Document> | null;
    /**
     * Instance of cheerio. Methods are specified in the modules. Usage of this
     * constructor is not recommended. Please use `$.load` instead.
     *
     * @private
     * @param elements - The new selection.
     * @param root - Sets the root node.
     * @param options - Options for the instance.
     */
    constructor(elements: ArrayLike<T> | undefined, root: Cheerio<Document> | null, options: InternalOptions);
    prevObject: Cheerio<any> | undefined;
    /**
     * Make a cheerio object.
     *
     * @private
     * @param dom - The contents of the new object.
     * @param context - The context of the new object.
     * @returns The new cheerio object.
     */
    abstract _make<T>(dom: ArrayLike<T> | T | string, context?: BasicAcceptedElems<AnyNode>): Cheerio<T>;
    /**
     * Parses some content.
     *
     * @private
     * @param content - Content to parse.
     * @param options - Options for parsing.
     * @param isDocument - Allows parser to be switched to fragment mode.
     * @returns A document containing the `content`.
     */
    abstract _parse(content: string | Document | AnyNode | AnyNode[] | Buffer, options: InternalOptions, isDocument: boolean, context: ParentNode | null): Document;
    /**
     * Render an element or a set of elements.
     *
     * @private
     * @param dom - DOM to render.
     * @returns The rendered DOM.
     */
    abstract _render(dom: AnyNode | ArrayLike<AnyNode>): string;
}
export interface Cheerio<T> extends AttributesType, TraversingType, ManipulationType, CssType, FormsType, Iterable<T> {
    cheerio: '[cheerio object]';
    splice: typeof Array.prototype.slice;
}
export {};
//# sourceMappingURL=cheerio.d.ts.map