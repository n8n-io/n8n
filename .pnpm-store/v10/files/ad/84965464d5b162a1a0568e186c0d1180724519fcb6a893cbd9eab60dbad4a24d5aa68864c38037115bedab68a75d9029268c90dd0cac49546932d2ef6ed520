/**
 * Methods for modifying the DOM structure.
 *
 * @module cheerio/manipulation
 */

import {
  isTag,
  Text,
  hasChildren,
  cloneNode,
  Document,
  type ParentNode,
  type AnyNode,
  type Element,
} from 'domhandler';
import { update as updateDOM } from '../parse.js';
import { text as staticText } from '../static.js';
import { domEach, isHtml, isCheerio } from '../utils.js';
import { removeElement } from 'domutils';
import type { Cheerio } from '../cheerio.js';
import type { BasicAcceptedElems, AcceptedElems } from '../types.js';

/**
 * Create an array of nodes, recursing into arrays and parsing strings if
 * necessary.
 *
 * @private
 * @category Manipulation
 * @param elem - Elements to make an array of.
 * @param clone - Optionally clone nodes.
 * @returns The array of nodes.
 */
export function _makeDomArray<T extends AnyNode>(
  this: Cheerio<T>,
  elem?: BasicAcceptedElems<AnyNode> | BasicAcceptedElems<AnyNode>[],
  clone?: boolean,
): AnyNode[] {
  if (elem == null) {
    return [];
  }

  if (typeof elem === 'string') {
    return this._parse(elem, this.options, false, null).children.slice(0);
  }

  if ('length' in elem) {
    if (elem.length === 1) {
      return this._makeDomArray(elem[0], clone);
    }

    const result: AnyNode[] = [];

    for (let i = 0; i < elem.length; i++) {
      const el = elem[i];

      if (typeof el === 'object') {
        if (el == null) {
          continue;
        }

        if (!('length' in el)) {
          result.push(clone ? cloneNode(el, true) : el);
          continue;
        }
      }

      result.push(...this._makeDomArray(el, clone));
    }

    return result;
  }

  return [clone ? cloneNode(elem, true) : elem];
}

function _insert(
  concatenator: (
    dom: AnyNode[],
    children: AnyNode[],
    parent: ParentNode,
  ) => void,
) {
  return function <T extends AnyNode>(
    this: Cheerio<T>,
    ...elems:
      | [
          (
            this: AnyNode,
            i: number,
            html: string,
          ) => BasicAcceptedElems<AnyNode>,
        ]
      | BasicAcceptedElems<AnyNode>[]
  ) {
    const lastIdx = this.length - 1;

    return domEach(this, (el, i) => {
      if (!hasChildren(el)) return;

      const domSrc =
        typeof elems[0] === 'function'
          ? elems[0].call(el, i, this._render(el.children))
          : (elems as BasicAcceptedElems<AnyNode>[]);

      const dom = this._makeDomArray(domSrc, i < lastIdx);
      concatenator(dom, el.children, el);
    });
  };
}

/**
 * Modify an array in-place, removing some number of elements and adding new
 * elements directly following them.
 *
 * @private
 * @category Manipulation
 * @param array - Target array to splice.
 * @param spliceIdx - Index at which to begin changing the array.
 * @param spliceCount - Number of elements to remove from the array.
 * @param newElems - Elements to insert into the array.
 * @param parent - The parent of the node.
 * @returns The spliced array.
 */
function uniqueSplice(
  array: AnyNode[],
  spliceIdx: number,
  spliceCount: number,
  newElems: AnyNode[],
  parent: ParentNode,
): AnyNode[] {
  const spliceArgs: Parameters<typeof Array.prototype.splice> = [
    spliceIdx,
    spliceCount,
    ...newElems,
  ];
  const prev = spliceIdx === 0 ? null : array[spliceIdx - 1];
  const next =
    spliceIdx + spliceCount >= array.length
      ? null
      : array[spliceIdx + spliceCount];

  /*
   * Before splicing in new elements, ensure they do not already appear in the
   * current array.
   */
  for (let idx = 0; idx < newElems.length; ++idx) {
    const node = newElems[idx];
    const oldParent = node.parent;

    if (oldParent) {
      const oldSiblings: AnyNode[] = oldParent.children;
      const prevIdx = oldSiblings.indexOf(node);

      if (prevIdx > -1) {
        oldParent.children.splice(prevIdx, 1);
        if (parent === oldParent && spliceIdx > prevIdx) {
          spliceArgs[0]--;
        }
      }
    }

    node.parent = parent;

    if (node.prev) {
      node.prev.next = node.next ?? null;
    }

    if (node.next) {
      node.next.prev = node.prev ?? null;
    }

    node.prev = idx === 0 ? prev : newElems[idx - 1];
    node.next = idx === newElems.length - 1 ? next : newElems[idx + 1];
  }

  if (prev) {
    prev.next = newElems[0];
  }
  if (next) {
    next.prev = newElems[newElems.length - 1];
  }
  return array.splice(...spliceArgs);
}

/**
 * Insert every element in the set of matched elements to the end of the target.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('<li class="plum">Plum</li>').appendTo('#fruits');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //      <li class="plum">Plum</li>
 * //    </ul>
 * ```
 *
 * @param target - Element to append elements to.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/appendTo/}
 */
export function appendTo<T extends AnyNode>(
  this: Cheerio<T>,
  target: BasicAcceptedElems<AnyNode>,
): Cheerio<T> {
  const appendTarget = isCheerio<T>(target) ? target : this._make(target);

  appendTarget.append(this);

  return this;
}

/**
 * Insert every element in the set of matched elements to the beginning of the
 * target.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('<li class="plum">Plum</li>').prependTo('#fruits');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="plum">Plum</li>
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param target - Element to prepend elements to.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/prependTo/}
 */
export function prependTo<T extends AnyNode>(
  this: Cheerio<T>,
  target: BasicAcceptedElems<AnyNode>,
): Cheerio<T> {
  const prependTarget = isCheerio<T>(target) ? target : this._make(target);

  prependTarget.prepend(this);

  return this;
}

/**
 * Inserts content as the _last_ child of each of the selected elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('ul').append('<li class="plum">Plum</li>');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //      <li class="plum">Plum</li>
 * //    </ul>
 * ```
 *
 * @see {@link https://api.jquery.com/append/}
 */
export const append: <T extends AnyNode>(
  this: Cheerio<T>,
  ...elems:
    | [(this: AnyNode, i: number, html: string) => BasicAcceptedElems<AnyNode>]
    | BasicAcceptedElems<AnyNode>[]
) => Cheerio<T> = _insert((dom, children, parent) => {
  uniqueSplice(children, children.length, 0, dom, parent);
});

/**
 * Inserts content as the _first_ child of each of the selected elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('ul').prepend('<li class="plum">Plum</li>');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="plum">Plum</li>
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @see {@link https://api.jquery.com/prepend/}
 */
export const prepend: <T extends AnyNode>(
  this: Cheerio<T>,
  ...elems:
    | [(this: AnyNode, i: number, html: string) => BasicAcceptedElems<AnyNode>]
    | BasicAcceptedElems<AnyNode>[]
) => Cheerio<T> = _insert((dom, children, parent) => {
  uniqueSplice(children, 0, 0, dom, parent);
});

function _wrap(
  insert: (
    el: AnyNode,
    elInsertLocation: ParentNode,
    wrapperDom: ParentNode[],
  ) => void,
) {
  return function <T extends AnyNode>(
    this: Cheerio<T>,
    wrapper: AcceptedElems<AnyNode>,
  ) {
    const lastIdx = this.length - 1;
    const lastParent = this.parents().last();

    for (let i = 0; i < this.length; i++) {
      const el = this[i];

      const wrap =
        typeof wrapper === 'function'
          ? wrapper.call(el, i, el)
          : typeof wrapper === 'string' && !isHtml(wrapper)
            ? lastParent.find(wrapper).clone()
            : wrapper;

      const [wrapperDom] = this._makeDomArray(wrap, i < lastIdx);

      if (!wrapperDom || !hasChildren(wrapperDom)) continue;

      let elInsertLocation = wrapperDom;

      /*
       * Find the deepest child. Only consider the first tag child of each node
       * (ignore text); stop if no children are found.
       */
      let j = 0;

      while (j < elInsertLocation.children.length) {
        const child = elInsertLocation.children[j];
        if (isTag(child)) {
          elInsertLocation = child;
          j = 0;
        } else {
          j++;
        }
      }

      insert(el, elInsertLocation, [wrapperDom]);
    }

    return this;
  };
}

/**
 * The .wrap() function can take any string or object that could be passed to
 * the $() factory function to specify a DOM structure. This structure may be
 * nested several levels deep, but should contain only one inmost element. A
 * copy of this structure will be wrapped around each of the elements in the set
 * of matched elements. This method returns the original set of elements for
 * chaining purposes.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * const redFruit = $('<div class="red-fruit"></div>');
 * $('.apple').wrap(redFruit);
 *
 * //=> <ul id="fruits">
 * //     <div class="red-fruit">
 * //      <li class="apple">Apple</li>
 * //     </div>
 * //     <li class="orange">Orange</li>
 * //     <li class="plum">Plum</li>
 * //   </ul>
 *
 * const healthy = $('<div class="healthy"></div>');
 * $('li').wrap(healthy);
 *
 * //=> <ul id="fruits">
 * //     <div class="healthy">
 * //       <li class="apple">Apple</li>
 * //     </div>
 * //     <div class="healthy">
 * //       <li class="orange">Orange</li>
 * //     </div>
 * //     <div class="healthy">
 * //        <li class="plum">Plum</li>
 * //     </div>
 * //   </ul>
 * ```
 *
 * @param wrapper - The DOM structure to wrap around each element in the
 *   selection.
 * @see {@link https://api.jquery.com/wrap/}
 */
export const wrap: <T extends AnyNode>(
  this: Cheerio<T>,
  wrapper: AcceptedElems<AnyNode>,
) => Cheerio<T> = _wrap((el, elInsertLocation, wrapperDom) => {
  const { parent } = el;

  if (!parent) return;

  const siblings: AnyNode[] = parent.children;
  const index = siblings.indexOf(el);

  updateDOM([el], elInsertLocation);
  /*
   * The previous operation removed the current element from the `siblings`
   * array, so the `dom` array can be inserted without removing any
   * additional elements.
   */
  uniqueSplice(siblings, index, 0, wrapperDom, parent);
});

/**
 * The .wrapInner() function can take any string or object that could be passed
 * to the $() factory function to specify a DOM structure. This structure may be
 * nested several levels deep, but should contain only one inmost element. The
 * structure will be wrapped around the content of each of the elements in the
 * set of matched elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * const redFruit = $('<div class="red-fruit"></div>');
 * $('.apple').wrapInner(redFruit);
 *
 * //=> <ul id="fruits">
 * //     <li class="apple">
 * //       <div class="red-fruit">Apple</div>
 * //     </li>
 * //     <li class="orange">Orange</li>
 * //     <li class="pear">Pear</li>
 * //   </ul>
 *
 * const healthy = $('<div class="healthy"></div>');
 * $('li').wrapInner(healthy);
 *
 * //=> <ul id="fruits">
 * //     <li class="apple">
 * //       <div class="healthy">Apple</div>
 * //     </li>
 * //     <li class="orange">
 * //       <div class="healthy">Orange</div>
 * //     </li>
 * //     <li class="pear">
 * //       <div class="healthy">Pear</div>
 * //     </li>
 * //   </ul>
 * ```
 *
 * @param wrapper - The DOM structure to wrap around the content of each element
 *   in the selection.
 * @returns The instance itself, for chaining.
 * @see {@link https://api.jquery.com/wrapInner/}
 */
export const wrapInner: <T extends AnyNode>(
  this: Cheerio<T>,
  wrapper: AcceptedElems<AnyNode>,
) => Cheerio<T> = _wrap((el, elInsertLocation, wrapperDom) => {
  if (!hasChildren(el)) return;
  updateDOM(el.children, elInsertLocation);
  updateDOM(wrapperDom, el);
});

/**
 * The .unwrap() function, removes the parents of the set of matched elements
 * from the DOM, leaving the matched elements in their place.
 *
 * @category Manipulation
 * @example <caption>without selector</caption>
 *
 * ```js
 * const $ = cheerio.load(
 *   '<div id=test>\n  <div><p>Hello</p></div>\n  <div><p>World</p></div>\n</div>',
 * );
 * $('#test p').unwrap();
 *
 * //=> <div id=test>
 * //     <p>Hello</p>
 * //     <p>World</p>
 * //   </div>
 * ```
 *
 * @example <caption>with selector</caption>
 *
 * ```js
 * const $ = cheerio.load(
 *   '<div id=test>\n  <p>Hello</p>\n  <b><p>World</p></b>\n</div>',
 * );
 * $('#test p').unwrap('b');
 *
 * //=> <div id=test>
 * //     <p>Hello</p>
 * //     <p>World</p>
 * //   </div>
 * ```
 *
 * @param selector - A selector to check the parent element against. If an
 *   element's parent does not match the selector, the element won't be
 *   unwrapped.
 * @returns The instance itself, for chaining.
 * @see {@link https://api.jquery.com/unwrap/}
 */
export function unwrap<T extends AnyNode>(
  this: Cheerio<T>,
  selector?: string,
): Cheerio<T> {
  this.parent(selector)
    .not('body')
    .each((_, el) => {
      this._make(el).replaceWith(el.children);
    });
  return this;
}

/**
 * The .wrapAll() function can take any string or object that could be passed to
 * the $() function to specify a DOM structure. This structure may be nested
 * several levels deep, but should contain only one inmost element. The
 * structure will be wrapped around all of the elements in the set of matched
 * elements, as a single group.
 *
 * @category Manipulation
 * @example <caption>With markup passed to `wrapAll`</caption>
 *
 * ```js
 * const $ = cheerio.load(
 *   '<div class="container"><div class="inner">First</div><div class="inner">Second</div></div>',
 * );
 * $('.inner').wrapAll("<div class='new'></div>");
 *
 * //=> <div class="container">
 * //     <div class='new'>
 * //       <div class="inner">First</div>
 * //       <div class="inner">Second</div>
 * //     </div>
 * //   </div>
 * ```
 *
 * @example <caption>With an existing cheerio instance</caption>
 *
 * ```js
 * const $ = cheerio.load(
 *   '<span>Span 1</span><strong>Strong</strong><span>Span 2</span>',
 * );
 * const wrap = $('<div><p><em><b></b></em></p></div>');
 * $('span').wrapAll(wrap);
 *
 * //=> <div>
 * //     <p>
 * //       <em>
 * //         <b>
 * //           <span>Span 1</span>
 * //           <span>Span 2</span>
 * //         </b>
 * //       </em>
 * //     </p>
 * //   </div>
 * //   <strong>Strong</strong>
 * ```
 *
 * @param wrapper - The DOM structure to wrap around all matched elements in the
 *   selection.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/wrapAll/}
 */
export function wrapAll<T extends AnyNode>(
  this: Cheerio<T>,
  wrapper: AcceptedElems<T>,
): Cheerio<T> {
  const el = this[0];
  if (el) {
    const wrap: Cheerio<AnyNode> = this._make(
      typeof wrapper === 'function' ? wrapper.call(el, 0, el) : wrapper,
    ).insertBefore(el);

    // If html is given as wrapper, wrap may contain text elements
    let elInsertLocation: Element | undefined;

    for (let i = 0; i < wrap.length; i++) {
      if (wrap[i].type === 'tag') elInsertLocation = wrap[i] as Element;
    }

    let j = 0;

    /*
     * Find the deepest child. Only consider the first tag child of each node
     * (ignore text); stop if no children are found.
     */
    while (elInsertLocation && j < elInsertLocation.children.length) {
      const child = elInsertLocation.children[j];
      if (child.type === 'tag') {
        elInsertLocation = child as Element;
        j = 0;
      } else {
        j++;
      }
    }

    if (elInsertLocation) this._make(elInsertLocation).append(this);
  }
  return this;
}

/**
 * Insert content next to each element in the set of matched elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.apple').after('<li class="plum">Plum</li>');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="plum">Plum</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param elems - HTML string, DOM element, array of DOM elements or Cheerio to
 *   insert after each element in the set of matched elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/after/}
 */
export function after<T extends AnyNode>(
  this: Cheerio<T>,
  ...elems:
    | [(this: AnyNode, i: number, html: string) => BasicAcceptedElems<AnyNode>]
    | BasicAcceptedElems<AnyNode>[]
): Cheerio<T> {
  const lastIdx = this.length - 1;

  return domEach(this, (el, i) => {
    if (!hasChildren(el) || !el.parent) {
      return;
    }

    const siblings: AnyNode[] = el.parent.children;
    const index = siblings.indexOf(el);

    // If not found, move on
    /* istanbul ignore next */
    if (index < 0) return;

    const domSrc =
      typeof elems[0] === 'function'
        ? elems[0].call(el, i, this._render(el.children))
        : (elems as BasicAcceptedElems<AnyNode>[]);

    const dom = this._makeDomArray(domSrc, i < lastIdx);

    // Add element after `this` element
    uniqueSplice(siblings, index + 1, 0, dom, el.parent);
  });
}

/**
 * Insert every element in the set of matched elements after the target.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('<li class="plum">Plum</li>').insertAfter('.apple');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="plum">Plum</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param target - Element to insert elements after.
 * @returns The set of newly inserted elements.
 * @see {@link https://api.jquery.com/insertAfter/}
 */
export function insertAfter<T extends AnyNode>(
  this: Cheerio<T>,
  target: BasicAcceptedElems<AnyNode>,
): Cheerio<T> {
  if (typeof target === 'string') {
    target = this._make<AnyNode>(target);
  }

  this.remove();

  const clones: T[] = [];

  for (const el of this._makeDomArray(target)) {
    const clonedSelf = this.clone().toArray();
    const { parent } = el;
    if (!parent) {
      continue;
    }

    const siblings: AnyNode[] = parent.children;
    const index = siblings.indexOf(el);

    // If not found, move on
    /* istanbul ignore next */
    if (index < 0) continue;

    // Add cloned `this` element(s) after target element
    uniqueSplice(siblings, index + 1, 0, clonedSelf, parent);
    clones.push(...clonedSelf);
  }

  return this._make(clones);
}

/**
 * Insert content previous to each element in the set of matched elements.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.apple').before('<li class="plum">Plum</li>');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="plum">Plum</li>
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param elems - HTML string, DOM element, array of DOM elements or Cheerio to
 *   insert before each element in the set of matched elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/before/}
 */
export function before<T extends AnyNode>(
  this: Cheerio<T>,
  ...elems:
    | [(this: AnyNode, i: number, html: string) => BasicAcceptedElems<AnyNode>]
    | BasicAcceptedElems<AnyNode>[]
): Cheerio<T> {
  const lastIdx = this.length - 1;

  return domEach(this, (el, i) => {
    if (!hasChildren(el) || !el.parent) {
      return;
    }

    const siblings: AnyNode[] = el.parent.children;
    const index = siblings.indexOf(el);

    // If not found, move on
    /* istanbul ignore next */
    if (index < 0) return;

    const domSrc =
      typeof elems[0] === 'function'
        ? elems[0].call(el, i, this._render(el.children))
        : (elems as BasicAcceptedElems<AnyNode>[]);

    const dom = this._makeDomArray(domSrc, i < lastIdx);

    // Add element before `el` element
    uniqueSplice(siblings, index, 0, dom, el.parent);
  });
}

/**
 * Insert every element in the set of matched elements before the target.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('<li class="plum">Plum</li>').insertBefore('.apple');
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="plum">Plum</li>
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //      <li class="pear">Pear</li>
 * //    </ul>
 * ```
 *
 * @param target - Element to insert elements before.
 * @returns The set of newly inserted elements.
 * @see {@link https://api.jquery.com/insertBefore/}
 */
export function insertBefore<T extends AnyNode>(
  this: Cheerio<T>,
  target: BasicAcceptedElems<AnyNode>,
): Cheerio<T> {
  const targetArr = this._make<AnyNode>(target);

  this.remove();

  const clones: T[] = [];

  domEach(targetArr, (el) => {
    const clonedSelf = this.clone().toArray();
    const { parent } = el;
    if (!parent) {
      return;
    }

    const siblings: AnyNode[] = parent.children;
    const index = siblings.indexOf(el);

    // If not found, move on
    /* istanbul ignore next */
    if (index < 0) return;

    // Add cloned `this` element(s) after target element
    uniqueSplice(siblings, index, 0, clonedSelf, parent);
    clones.push(...clonedSelf);
  });

  return this._make(clones);
}

/**
 * Removes the set of matched elements from the DOM and all their children.
 * `selector` filters the set of matched elements to be removed.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.pear').remove();
 * $.html();
 * //=>  <ul id="fruits">
 * //      <li class="apple">Apple</li>
 * //      <li class="orange">Orange</li>
 * //    </ul>
 * ```
 *
 * @param selector - Optional selector for elements to remove.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/remove/}
 */
export function remove<T extends AnyNode>(
  this: Cheerio<T>,
  selector?: string,
): Cheerio<T> {
  // Filter if we have selector
  const elems = selector ? this.filter(selector) : this;

  domEach(elems, (el) => {
    removeElement(el);
    el.prev = el.next = el.parent = null;
  });

  return this;
}

/**
 * Replaces matched elements with `content`.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * const plum = $('<li class="plum">Plum</li>');
 * $('.pear').replaceWith(plum);
 * $.html();
 * //=> <ul id="fruits">
 * //     <li class="apple">Apple</li>
 * //     <li class="orange">Orange</li>
 * //     <li class="plum">Plum</li>
 * //   </ul>
 * ```
 *
 * @param content - Replacement for matched elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/replaceWith/}
 */
export function replaceWith<T extends AnyNode>(
  this: Cheerio<T>,
  content: AcceptedElems<AnyNode>,
): Cheerio<T> {
  return domEach(this, (el, i) => {
    const { parent } = el;
    if (!parent) {
      return;
    }

    const siblings: AnyNode[] = parent.children;
    const cont =
      typeof content === 'function' ? content.call(el, i, el) : content;
    const dom = this._makeDomArray(cont);

    /*
     * In the case that `dom` contains nodes that already exist in other
     * structures, ensure those nodes are properly removed.
     */
    updateDOM(dom, null);

    const index = siblings.indexOf(el);

    // Completely remove old element
    uniqueSplice(siblings, index, 1, dom, parent);

    if (!dom.includes(el)) {
      el.parent = el.prev = el.next = null;
    }
  });
}

/**
 * Removes all children from each item in the selection. Text nodes and comment
 * nodes are left as is.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('ul').empty();
 * $.html();
 * //=>  <ul id="fruits"></ul>
 * ```
 *
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/empty/}
 */
export function empty<T extends AnyNode>(this: Cheerio<T>): Cheerio<T> {
  return domEach(this, (el) => {
    if (!hasChildren(el)) return;
    for (const child of el.children) {
      child.next = child.prev = child.parent = null;
    }

    el.children.length = 0;
  });
}

/**
 * Gets an HTML content string from the first selected element.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.orange').html();
 * //=> Orange
 *
 * $('#fruits').html('<li class="mango">Mango</li>').html();
 * //=> <li class="mango">Mango</li>
 * ```
 *
 * @returns The HTML content string.
 * @see {@link https://api.jquery.com/html/}
 */
export function html<T extends AnyNode>(this: Cheerio<T>): string | null;
/**
 * Replaces each selected element's content with the specified content.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.orange').html('<li class="mango">Mango</li>').html();
 * //=> <li class="mango">Mango</li>
 * ```
 *
 * @param str - The content to replace selection's contents with.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/html/}
 */
export function html<T extends AnyNode>(
  this: Cheerio<T>,
  str: string | Cheerio<T>,
): Cheerio<T>;
export function html<T extends AnyNode>(
  this: Cheerio<T>,
  str?: string | Cheerio<AnyNode>,
): Cheerio<T> | string | null {
  if (str === undefined) {
    const el = this[0];
    if (!el || !hasChildren(el)) return null;
    return this._render(el.children);
  }

  return domEach(this, (el) => {
    if (!hasChildren(el)) return;
    for (const child of el.children) {
      child.next = child.prev = child.parent = null;
    }

    const content = isCheerio(str)
      ? str.toArray()
      : this._parse(`${str}`, this.options, false, el).children;

    updateDOM(content, el);
  });
}

/**
 * Turns the collection to a string. Alias for `.html()`.
 *
 * @category Manipulation
 * @returns The rendered document.
 */
export function toString<T extends AnyNode>(this: Cheerio<T>): string {
  return this._render(this);
}

/**
 * Get the combined text contents of each element in the set of matched
 * elements, including their descendants.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.orange').text();
 * //=> Orange
 *
 * $('ul').text();
 * //=>  Apple
 * //    Orange
 * //    Pear
 * ```
 *
 * @returns The text contents of the collection.
 * @see {@link https://api.jquery.com/text/}
 */
export function text<T extends AnyNode>(this: Cheerio<T>): string;
/**
 * Set the content of each element in the set of matched elements to the
 * specified text.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * $('.orange').text('Orange');
 * //=> <div class="orange">Orange</div>
 * ```
 *
 * @param str - The text to set as the content of each matched element.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/text/}
 */
export function text<T extends AnyNode>(
  this: Cheerio<T>,
  str: string | ((this: AnyNode, i: number, text: string) => string),
): Cheerio<T>;
export function text<T extends AnyNode>(
  this: Cheerio<T>,
  str?: string | ((this: AnyNode, i: number, text: string) => string),
): Cheerio<T> | string {
  // If `str` is undefined, act as a "getter"
  if (str === undefined) {
    return staticText(this);
  }
  if (typeof str === 'function') {
    // Function support
    return domEach(this, (el, i) =>
      this._make(el).text(str.call(el, i, staticText([el]))),
    );
  }

  // Append text node to each selected elements
  return domEach(this, (el) => {
    if (!hasChildren(el)) return;
    for (const child of el.children) {
      child.next = child.prev = child.parent = null;
    }

    const textNode = new Text(`${str}`);

    updateDOM(textNode, el);
  });
}

/**
 * Clone the cheerio object.
 *
 * @category Manipulation
 * @example
 *
 * ```js
 * const moreFruit = $('#fruits').clone();
 * ```
 *
 * @returns The cloned object.
 * @see {@link https://api.jquery.com/clone/}
 */
export function clone<T extends AnyNode>(this: Cheerio<T>): Cheerio<T> {
  const clone = Array.prototype.map.call(this.get(), (el) =>
    cloneNode(el, true),
  ) as T[];

  // Add a root node around the cloned nodes
  const root = new Document(clone);
  for (const node of clone) {
    node.parent = root;
  }

  return this._make(clone);
}
