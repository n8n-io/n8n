import type { BasicAcceptedElems } from './types.js';
import type { CheerioAPI } from './load.js';
import type { Cheerio } from './cheerio.js';
import type { AnyNode, Document } from 'domhandler';
import { textContent } from 'domutils';
import {
  type InternalOptions,
  type CheerioOptions,
  flattenOptions as flattenOptions,
} from './options.js';
import type { ExtractedMap, ExtractMap } from './api/extract.js';

/**
 * Helper function to render a DOM.
 *
 * @param that - Cheerio instance to render.
 * @param dom - The DOM to render. Defaults to `that`'s root.
 * @param options - Options for rendering.
 * @returns The rendered document.
 */
function render(
  that: CheerioAPI,
  dom: BasicAcceptedElems<AnyNode> | undefined,
  options: InternalOptions,
): string {
  if (!that) return '';

  return that(dom ?? that._root.children, null, undefined, options).toString();
}

/**
 * Checks if a passed object is an options object.
 *
 * @param dom - Object to check if it is an options object.
 * @param options - Options object.
 * @returns Whether the object is an options object.
 */
function isOptions(
  dom?: BasicAcceptedElems<AnyNode> | CheerioOptions | null,
  options?: CheerioOptions,
): dom is CheerioOptions {
  return (
    !options &&
    typeof dom === 'object' &&
    dom != null &&
    !('length' in dom) &&
    !('type' in dom)
  );
}

/**
 * Renders the document.
 *
 * @category Static
 * @param options - Options for the renderer.
 * @returns The rendered document.
 */
export function html(this: CheerioAPI, options?: CheerioOptions): string;
/**
 * Renders the document.
 *
 * @category Static
 * @param dom - Element to render.
 * @param options - Options for the renderer.
 * @returns The rendered document.
 */
export function html(
  this: CheerioAPI,
  dom?: BasicAcceptedElems<AnyNode>,
  options?: CheerioOptions,
): string;
export function html(
  this: CheerioAPI,
  dom?: BasicAcceptedElems<AnyNode> | CheerioOptions,
  options?: CheerioOptions,
): string {
  /*
   * Be flexible about parameters, sometimes we call html(),
   * with options as only parameter
   * check dom argument for dom element specific properties
   * assume there is no 'length' or 'type' properties in the options object
   */
  const toRender = isOptions(dom) ? ((options = dom), undefined) : dom;

  /*
   * Sometimes `$.html()` is used without preloading html,
   * so fallback non-existing options to the default ones.
   */
  const opts = {
    ...this?._options,
    ...flattenOptions(options),
  };

  return render(this, toRender, opts);
}

/**
 * Render the document as XML.
 *
 * @category Static
 * @param dom - Element to render.
 * @returns THe rendered document.
 */
export function xml(
  this: CheerioAPI,
  dom?: BasicAcceptedElems<AnyNode>,
): string {
  const options = { ...this._options, xmlMode: true };

  return render(this, dom, options);
}

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
export function text(
  this: CheerioAPI | void,
  elements?: ArrayLike<AnyNode>,
): string {
  const elems = elements ?? (this ? this.root() : []);

  let ret = '';

  for (let i = 0; i < elems.length; i++) {
    ret += textContent(elems[i]);
  }

  return ret;
}

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
export function parseHTML(
  this: CheerioAPI,
  data: string,
  context?: unknown | boolean,
  keepScripts?: boolean,
): AnyNode[];
export function parseHTML(this: CheerioAPI, data?: '' | null): null;
export function parseHTML(
  this: CheerioAPI,
  data?: string | null,
  context?: unknown | boolean,
  keepScripts = typeof context === 'boolean' ? context : false,
): AnyNode[] | null {
  if (!data || typeof data !== 'string') {
    return null;
  }

  if (typeof context === 'boolean') {
    keepScripts = context;
  }

  const parsed = this.load(data, this._options, false);
  if (!keepScripts) {
    parsed('script').remove();
  }

  /*
   * The `children` array is used by Cheerio internally to group elements that
   * share the same parents. When nodes created through `parseHTML` are
   * inserted into previously-existing DOM structures, they will be removed
   * from the `children` array. The results of `parseHTML` should remain
   * constant across these operations, so a shallow copy should be returned.
   */
  return [...parsed.root()[0].children];
}

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
export function root(this: CheerioAPI): Cheerio<Document> {
  return this(this._root);
}

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
export function contains(container: AnyNode, contained: AnyNode): boolean {
  // According to the jQuery API, an element does not "contain" itself
  if (contained === container) {
    return false;
  }

  /*
   * Step up the descendants, stopping when the root element is reached
   * (signaled by `.parent` returning a reference to the same object)
   */
  let next: AnyNode | null = contained;
  while (next && next !== next.parent) {
    next = next.parent;
    if (next === container) {
      return true;
    }
  }

  return false;
}

/**
 * Extract multiple values from a document, and store them in an object.
 *
 * @category Static
 * @param map - An object containing key-value pairs. The keys are the names of
 *   the properties to be created on the object, and the values are the
 *   selectors to be used to extract the values.
 * @returns An object containing the extracted values.
 */
export function extract<M extends ExtractMap>(
  this: CheerioAPI,
  map: M,
): ExtractedMap<M> {
  return this.root().extract(map);
}

type Writable<T> = { -readonly [P in keyof T]: T[P] };

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
export function merge<T>(
  arr1: Writable<ArrayLike<T>>,
  arr2: ArrayLike<T>,
): ArrayLike<T> | undefined {
  if (!isArrayLike(arr1) || !isArrayLike(arr2)) {
    return;
  }
  let newLength = arr1.length;
  const len = +arr2.length;

  for (let i = 0; i < len; i++) {
    arr1[newLength++] = arr2[i];
  }
  arr1.length = newLength;
  return arr1;
}

/**
 * Checks if an object is array-like.
 *
 * @category Static
 * @param item - Item to check.
 * @returns Indicates if the item is array-like.
 */
function isArrayLike(item: unknown): item is ArrayLike<unknown> {
  if (Array.isArray(item)) {
    return true;
  }

  if (
    typeof item !== 'object' ||
    item === null ||
    !('length' in item) ||
    typeof item.length !== 'number' ||
    item.length < 0
  ) {
    return false;
  }

  for (let i = 0; i < item.length; i++) {
    if (!(i in item)) {
      return false;
    }
  }
  return true;
}
