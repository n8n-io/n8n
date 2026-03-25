/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import type { InternalOptions } from './options.js';
import type { AnyNode, Document, ParentNode } from 'domhandler';
import type { BasicAcceptedElems } from './types.js';

import * as Attributes from './api/attributes.js';
import * as Traversing from './api/traversing.js';
import * as Manipulation from './api/manipulation.js';
import * as Css from './api/css.js';
import * as Forms from './api/forms.js';
import * as Extract from './api/extract.js';

type MethodsType = typeof Attributes &
  typeof Traversing &
  typeof Manipulation &
  typeof Css &
  typeof Forms &
  typeof Extract;

/**
 * The cheerio class is the central class of the library. It wraps a set of
 * elements and provides an API for traversing, modifying, and interacting with
 * the set.
 *
 * Loading a document will return the Cheerio class bound to the root element of
 * the document. The class will be instantiated when querying the document (when
 * calling `$('selector')`).
 *
 * @example This is the HTML markup we will be using in all of the API examples:
 *
 * ```html
 * <ul id="fruits">
 *   <li class="apple">Apple</li>
 *   <li class="orange">Orange</li>
 *   <li class="pear">Pear</li>
 * </ul>
 * ```
 */
export abstract class Cheerio<T> implements ArrayLike<T> {
  length = 0;
  [index: number]: T;

  options: InternalOptions;
  /**
   * The root of the document. Can be set by using the `root` argument of the
   * constructor.
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
  constructor(
    elements: ArrayLike<T> | undefined,
    root: Cheerio<Document> | null,
    options: InternalOptions,
  ) {
    this.options = options;
    this._root = root;

    if (elements) {
      for (let idx = 0; idx < elements.length; idx++) {
        this[idx] = elements[idx];
      }
      this.length = elements.length;
    }
  }

  prevObject: Cheerio<any> | undefined;
  /**
   * Make a cheerio object.
   *
   * @private
   * @param dom - The contents of the new object.
   * @param context - The context of the new object.
   * @returns The new cheerio object.
   */
  abstract _make<T>(
    dom: ArrayLike<T> | T | string,
    context?: BasicAcceptedElems<AnyNode>,
  ): Cheerio<T>;

  /**
   * Parses some content.
   *
   * @private
   * @param content - Content to parse.
   * @param options - Options for parsing.
   * @param isDocument - Allows parser to be switched to fragment mode.
   * @returns A document containing the `content`.
   */
  abstract _parse(
    content: string | Document | AnyNode | AnyNode[] | Buffer,
    options: InternalOptions,
    isDocument: boolean,
    context: ParentNode | null,
  ): Document;

  /**
   * Render an element or a set of elements.
   *
   * @private
   * @param dom - DOM to render.
   * @returns The rendered DOM.
   */
  abstract _render(dom: AnyNode | ArrayLike<AnyNode>): string;
}

export interface Cheerio<T> extends MethodsType, Iterable<T> {
  cheerio: '[cheerio object]';

  splice: typeof Array.prototype.splice;
}

/** Set a signature of the object. */
Cheerio.prototype.cheerio = '[cheerio object]';

/*
 * Make cheerio an array-like object
 */
Cheerio.prototype.splice = Array.prototype.splice;

// Support for (const element of $(...)) iteration:
Cheerio.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];

// Plug in the API
Object.assign(
  Cheerio.prototype,
  Attributes,
  Traversing,
  Manipulation,
  Css,
  Forms,
  Extract,
);
