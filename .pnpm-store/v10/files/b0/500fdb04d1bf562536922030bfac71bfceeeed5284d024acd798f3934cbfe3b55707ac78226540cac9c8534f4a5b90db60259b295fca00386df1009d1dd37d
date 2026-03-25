/**
 * Methods for traversing the DOM structure.
 *
 * @module cheerio/traversing
 */

import {
  isTag,
  type AnyNode,
  type Element,
  hasChildren,
  isDocument,
  type Document,
} from 'domhandler';
import type { Cheerio } from '../cheerio.js';
import * as select from 'cheerio-select';
import { domEach, isCheerio } from '../utils.js';
import { contains } from '../static.js';
import {
  getChildren,
  getSiblings,
  nextElementSibling,
  prevElementSibling,
  uniqueSort,
} from 'domutils';
import type { FilterFunction, AcceptedFilters } from '../types.js';
const reSiblingSelector = /^\s*[+~]/;

/**
 * Get the descendants of each element in the current set of matched elements,
 * filtered by a selector, jQuery object, or element.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').find('li').length;
 * //=> 3
 * $('#fruits').find($('.apple')).length;
 * //=> 1
 * ```
 *
 * @param selectorOrHaystack - Element to look for.
 * @returns The found elements.
 * @see {@link https://api.jquery.com/find/}
 */
export function find<T extends AnyNode>(
  this: Cheerio<T>,
  selectorOrHaystack?: string | Cheerio<Element> | Element,
): Cheerio<Element> {
  if (!selectorOrHaystack) {
    return this._make([]);
  }

  if (typeof selectorOrHaystack !== 'string') {
    const haystack = isCheerio(selectorOrHaystack)
      ? selectorOrHaystack.toArray()
      : [selectorOrHaystack];

    const context = this.toArray();

    return this._make(
      haystack.filter((elem) => context.some((node) => contains(node, elem))),
    );
  }

  return this._findBySelector(selectorOrHaystack, Number.POSITIVE_INFINITY);
}

/**
 * Find elements by a specific selector.
 *
 * @private
 * @category Traversing
 * @param selector - Selector to filter by.
 * @param limit - Maximum number of elements to match.
 * @returns The found elements.
 */
export function _findBySelector<T extends AnyNode>(
  this: Cheerio<T>,
  selector: string,
  limit: number,
): Cheerio<Element> {
  const context = this.toArray();

  const elems = reSiblingSelector.test(selector)
    ? context
    : this.children().toArray();

  const options = {
    context,
    root: this._root?.[0],

    // Pass options that are recognized by `cheerio-select`
    xmlMode: this.options.xmlMode,
    lowerCaseTags: this.options.lowerCaseTags,
    lowerCaseAttributeNames: this.options.lowerCaseAttributeNames,
    pseudos: this.options.pseudos,
    quirksMode: this.options.quirksMode,
  };

  return this._make(select.select(selector, elems, options, limit));
}

/**
 * Creates a matcher, using a particular mapping function. Matchers provide a
 * function that finds elements using a generating function, supporting
 * filtering.
 *
 * @private
 * @param matchMap - Mapping function.
 * @returns - Function for wrapping generating functions.
 */
function _getMatcher<P>(
  matchMap: (fn: (elem: AnyNode) => P, elems: Cheerio<AnyNode>) => Element[],
) {
  return function (
    fn: (elem: AnyNode) => P,
    ...postFns: ((elems: Element[]) => Element[])[]
  ) {
    return function <T extends AnyNode>(
      this: Cheerio<T>,
      selector?: AcceptedFilters<Element>,
    ): Cheerio<Element> {
      let matched: Element[] = matchMap(fn, this);

      if (selector) {
        matched = filterArray(
          matched,
          selector,
          this.options.xmlMode,
          this._root?.[0],
        );
      }

      return this._make(
        // Post processing is only necessary if there is more than one element.
        this.length > 1 && matched.length > 1
          ? postFns.reduce((elems, fn) => fn(elems), matched)
          : matched,
      );
    };
  };
}

/** Matcher that adds multiple elements for each entry in the input. */
const _matcher = _getMatcher((fn: (elem: AnyNode) => Element[], elems) => {
  let ret: Element[] = [];

  for (let i = 0; i < elems.length; i++) {
    const value = fn(elems[i]);
    if (value.length > 0) ret = ret.concat(value);
  }

  return ret;
});

/** Matcher that adds at most one element for each entry in the input. */
const _singleMatcher = _getMatcher(
  (fn: (elem: AnyNode) => Element | null, elems) => {
    const ret: Element[] = [];

    for (let i = 0; i < elems.length; i++) {
      const value = fn(elems[i]);
      if (value !== null) {
        ret.push(value);
      }
    }
    return ret;
  },
);

/**
 * Matcher that supports traversing until a condition is met.
 *
 * @param nextElem - Function that returns the next element.
 * @param postFns - Post processing functions.
 * @returns A function usable for `*Until` methods.
 */
function _matchUntil(
  nextElem: (elem: AnyNode) => Element | null,
  ...postFns: ((elems: Element[]) => Element[])[]
) {
  // We use a variable here that is used from within the matcher.
  let matches: ((el: Element, i: number) => boolean) | null = null;

  const innerMatcher = _getMatcher(
    (nextElem: (elem: AnyNode) => Element | null, elems) => {
      const matched: Element[] = [];

      domEach(elems, (elem) => {
        for (let next; (next = nextElem(elem)); elem = next) {
          // FIXME: `matched` might contain duplicates here and the index is too large.
          if (matches?.(next, matched.length)) break;
          matched.push(next);
        }
      });

      return matched;
    },
  )(nextElem, ...postFns);

  return function <T extends AnyNode>(
    this: Cheerio<T>,
    selector?: AcceptedFilters<Element> | null,
    filterSelector?: AcceptedFilters<Element>,
  ): Cheerio<Element> {
    // Override `matches` variable with the new target.
    matches =
      typeof selector === 'string'
        ? (elem: Element) => select.is(elem, selector, this.options)
        : selector
          ? getFilterFn(selector)
          : null;

    const ret = innerMatcher.call(this, filterSelector);

    // Set `matches` to `null`, so we don't waste memory.
    matches = null;

    return ret;
  };
}

function _removeDuplicates<T extends AnyNode>(elems: T[]): T[] {
  return elems.length > 1 ? Array.from(new Set<T>(elems)) : elems;
}

/**
 * Get the parent of each element in the current set of matched elements,
 * optionally filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').parent().attr('id');
 * //=> fruits
 * ```
 *
 * @param selector - If specified filter for parent.
 * @returns The parents.
 * @see {@link https://api.jquery.com/parent/}
 */
export const parent: <T extends AnyNode>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<Element>,
) => Cheerio<Element> = _singleMatcher(
  ({ parent }) => (parent && !isDocument(parent) ? (parent as Element) : null),
  _removeDuplicates,
);

/**
 * Get a set of parents filtered by `selector` of each element in the current
 * set of match elements.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.orange').parents().length;
 * //=> 2
 * $('.orange').parents('#fruits').length;
 * //=> 1
 * ```
 *
 * @param selector - If specified filter for parents.
 * @returns The parents.
 * @see {@link https://api.jquery.com/parents/}
 */
export const parents: <T extends AnyNode>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<Element>,
) => Cheerio<Element> = _matcher(
  (elem) => {
    const matched = [];
    while (elem.parent && !isDocument(elem.parent)) {
      matched.push(elem.parent as Element);
      elem = elem.parent;
    }
    return matched;
  },
  uniqueSort,
  (elems) => elems.reverse(),
);

/**
 * Get the ancestors of each element in the current set of matched elements, up
 * to but not including the element matched by the selector, DOM node, or
 * cheerio object.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.orange').parentsUntil('#food').length;
 * //=> 1
 * ```
 *
 * @param selector - Selector for element to stop at.
 * @param filterSelector - Optional filter for parents.
 * @returns The parents.
 * @see {@link https://api.jquery.com/parentsUntil/}
 */
export const parentsUntil: <T extends AnyNode>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<Element> | null,
  filterSelector?: AcceptedFilters<Element>,
) => Cheerio<Element> = _matchUntil(
  ({ parent }) => (parent && !isDocument(parent) ? (parent as Element) : null),
  uniqueSort,
  (elems) => elems.reverse(),
);

/**
 * For each element in the set, get the first element that matches the selector
 * by testing the element itself and traversing up through its ancestors in the
 * DOM tree.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.orange').closest();
 * //=> []
 *
 * $('.orange').closest('.apple');
 * // => []
 *
 * $('.orange').closest('li');
 * //=> [<li class="orange">Orange</li>]
 *
 * $('.orange').closest('#fruits');
 * //=> [<ul id="fruits"> ... </ul>]
 * ```
 *
 * @param selector - Selector for the element to find.
 * @returns The closest nodes.
 * @see {@link https://api.jquery.com/closest/}
 */
export function closest<T extends AnyNode>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<Element>,
): Cheerio<AnyNode> {
  const set: AnyNode[] = [];

  if (!selector) {
    return this._make(set);
  }

  const selectOpts = {
    xmlMode: this.options.xmlMode,
    root: this._root?.[0],
  };

  const selectFn =
    typeof selector === 'string'
      ? (elem: Element) => select.is(elem, selector, selectOpts)
      : getFilterFn(selector);

  domEach(this, (elem: AnyNode | null) => {
    if (elem && !isDocument(elem) && !isTag(elem)) {
      elem = elem.parent;
    }
    while (elem && isTag(elem)) {
      if (selectFn(elem, 0)) {
        // Do not add duplicate elements to the set
        if (!set.includes(elem)) {
          set.push(elem);
        }
        break;
      }
      elem = elem.parent;
    }
  });

  return this._make(set);
}

/**
 * Gets the next sibling of each selected element, optionally filtered by a
 * selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.apple').next().hasClass('orange');
 * //=> true
 * ```
 *
 * @param selector - If specified filter for sibling.
 * @returns The next nodes.
 * @see {@link https://api.jquery.com/next/}
 */
export const next: <T extends AnyNode>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<Element>,
) => Cheerio<Element> = _singleMatcher((elem) => nextElementSibling(elem));

/**
 * Gets all the following siblings of the each selected element, optionally
 * filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.apple').nextAll();
 * //=> [<li class="orange">Orange</li>, <li class="pear">Pear</li>]
 * $('.apple').nextAll('.orange');
 * //=> [<li class="orange">Orange</li>]
 * ```
 *
 * @param selector - If specified filter for siblings.
 * @returns The next nodes.
 * @see {@link https://api.jquery.com/nextAll/}
 */
export const nextAll: <T extends AnyNode>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<Element>,
) => Cheerio<Element> = _matcher((elem) => {
  const matched = [];
  while (elem.next) {
    elem = elem.next;
    if (isTag(elem)) matched.push(elem);
  }
  return matched;
}, _removeDuplicates);

/**
 * Gets all the following siblings up to but not including the element matched
 * by the selector, optionally filtered by another selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.apple').nextUntil('.pear');
 * //=> [<li class="orange">Orange</li>]
 * ```
 *
 * @param selector - Selector for element to stop at.
 * @param filterSelector - If specified filter for siblings.
 * @returns The next nodes.
 * @see {@link https://api.jquery.com/nextUntil/}
 */
export const nextUntil: <T extends AnyNode>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<Element> | null,
  filterSelector?: AcceptedFilters<Element>,
) => Cheerio<Element> = _matchUntil(
  (el) => nextElementSibling(el),
  _removeDuplicates,
);

/**
 * Gets the previous sibling of each selected element optionally filtered by a
 * selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.orange').prev().hasClass('apple');
 * //=> true
 * ```
 *
 * @param selector - If specified filter for siblings.
 * @returns The previous nodes.
 * @see {@link https://api.jquery.com/prev/}
 */
export const prev: <T extends AnyNode>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<Element>,
) => Cheerio<Element> = _singleMatcher((elem) => prevElementSibling(elem));

/**
 * Gets all the preceding siblings of each selected element, optionally filtered
 * by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').prevAll();
 * //=> [<li class="orange">Orange</li>, <li class="apple">Apple</li>]
 *
 * $('.pear').prevAll('.orange');
 * //=> [<li class="orange">Orange</li>]
 * ```
 *
 * @param selector - If specified filter for siblings.
 * @returns The previous nodes.
 * @see {@link https://api.jquery.com/prevAll/}
 */
export const prevAll: <T extends AnyNode>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<Element>,
) => Cheerio<Element> = _matcher((elem) => {
  const matched = [];
  while (elem.prev) {
    elem = elem.prev;
    if (isTag(elem)) matched.push(elem);
  }
  return matched;
}, _removeDuplicates);

/**
 * Gets all the preceding siblings up to but not including the element matched
 * by the selector, optionally filtered by another selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').prevUntil('.apple');
 * //=> [<li class="orange">Orange</li>]
 * ```
 *
 * @param selector - Selector for element to stop at.
 * @param filterSelector - If specified filter for siblings.
 * @returns The previous nodes.
 * @see {@link https://api.jquery.com/prevUntil/}
 */
export const prevUntil: <T extends AnyNode>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<Element> | null,
  filterSelector?: AcceptedFilters<Element>,
) => Cheerio<Element> = _matchUntil(
  (el) => prevElementSibling(el),
  _removeDuplicates,
);

/**
 * Get the siblings of each element (excluding the element) in the set of
 * matched elements, optionally filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').siblings().length;
 * //=> 2
 *
 * $('.pear').siblings('.orange').length;
 * //=> 1
 * ```
 *
 * @param selector - If specified filter for siblings.
 * @returns The siblings.
 * @see {@link https://api.jquery.com/siblings/}
 */
export const siblings: <T extends AnyNode>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<Element>,
) => Cheerio<Element> = _matcher(
  (elem) =>
    getSiblings(elem).filter((el): el is Element => isTag(el) && el !== elem),
  uniqueSort,
);

/**
 * Gets the element children of each element in the set of matched elements.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').children().length;
 * //=> 3
 *
 * $('#fruits').children('.pear').text();
 * //=> Pear
 * ```
 *
 * @param selector - If specified filter for children.
 * @returns The children.
 * @see {@link https://api.jquery.com/children/}
 */
export const children: <T extends AnyNode>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<Element>,
) => Cheerio<Element> = _matcher(
  (elem) => getChildren(elem).filter(isTag),
  _removeDuplicates,
);

/**
 * Gets the children of each element in the set of matched elements, including
 * text and comment nodes.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').contents().length;
 * //=> 3
 * ```
 *
 * @returns The children.
 * @see {@link https://api.jquery.com/contents/}
 */
export function contents<T extends AnyNode>(
  this: Cheerio<T>,
): Cheerio<AnyNode> {
  const elems = this.toArray().reduce<AnyNode[]>(
    (newElems, elem) =>
      hasChildren(elem) ? newElems.concat(elem.children) : newElems,
    [],
  );
  return this._make(elems);
}

/**
 * Iterates over a cheerio object, executing a function for each matched
 * element. When the callback is fired, the function is fired in the context of
 * the DOM element, so `this` refers to the current element, which is equivalent
 * to the function parameter `element`. To break out of the `each` loop early,
 * return with `false`.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * const fruits = [];
 *
 * $('li').each(function (i, elem) {
 *   fruits[i] = $(this).text();
 * });
 *
 * fruits.join(', ');
 * //=> Apple, Orange, Pear
 * ```
 *
 * @param fn - Function to execute.
 * @returns The instance itself, useful for chaining.
 * @see {@link https://api.jquery.com/each/}
 */
export function each<T>(
  this: Cheerio<T>,
  fn: (this: T, i: number, el: T) => void | boolean,
): Cheerio<T> {
  let i = 0;
  const len = this.length;
  while (i < len && fn.call(this[i], i, this[i]) !== false) ++i;
  return this;
}

/**
 * Pass each element in the current matched set through a function, producing a
 * new Cheerio object containing the return values. The function can return an
 * individual data item or an array of data items to be inserted into the
 * resulting set. If an array is returned, the elements inside the array are
 * inserted into the set. If the function returns null or undefined, no element
 * will be inserted.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li')
 *   .map(function (i, el) {
 *     // this === el
 *     return $(this).text();
 *   })
 *   .toArray()
 *   .join(' ');
 * //=> "apple orange pear"
 * ```
 *
 * @param fn - Function to execute.
 * @returns The mapped elements, wrapped in a Cheerio collection.
 * @see {@link https://api.jquery.com/map/}
 */
export function map<T, M>(
  this: Cheerio<T>,
  fn: (this: T, i: number, el: T) => M[] | M | null | undefined,
): Cheerio<M> {
  let elems: M[] = [];
  for (let i = 0; i < this.length; i++) {
    const el = this[i];
    const val = fn.call(el, i, el);
    if (val != null) {
      elems = elems.concat(val);
    }
  }
  return this._make(elems);
}

/**
 * Creates a function to test if a filter is matched.
 *
 * @param match - A filter.
 * @returns A function that determines if a filter has been matched.
 */
function getFilterFn<T>(
  match: FilterFunction<T> | Cheerio<T> | T,
): (el: T, i: number) => boolean {
  if (typeof match === 'function') {
    return (el, i) => (match as FilterFunction<T>).call(el, i, el);
  }
  if (isCheerio<T>(match)) {
    return (el) => Array.prototype.includes.call(match, el);
  }
  return function (el) {
    return match === el;
  };
}

/**
 * Iterates over a cheerio object, reducing the set of selector elements to
 * those that match the selector or pass the function's test.
 *
 * This is the definition for using type guards; have a look below for other
 * ways to invoke this method. The function is executed in the context of the
 * selected element, so `this` refers to the current element.
 *
 * @category Traversing
 * @example <caption>Function</caption>
 *
 * ```js
 * $('li')
 *   .filter(function (i, el) {
 *     // this === el
 *     return $(this).attr('class') === 'orange';
 *   })
 *   .attr('class'); //=> orange
 * ```
 *
 * @param match - Value to look for, following the rules above.
 * @returns The filtered collection.
 * @see {@link https://api.jquery.com/filter/}
 */
export function filter<T, S extends T>(
  this: Cheerio<T>,
  match: (this: T, index: number, value: T) => value is S,
): Cheerio<S>;
/**
 * Iterates over a cheerio object, reducing the set of selector elements to
 * those that match the selector or pass the function's test.
 *
 * - When a Cheerio selection is specified, return only the elements contained in
 *   that selection.
 * - When an element is specified, return only that element (if it is contained in
 *   the original selection).
 * - If using the function method, the function is executed in the context of the
 *   selected element, so `this` refers to the current element.
 *
 * @category Traversing
 * @example <caption>Selector</caption>
 *
 * ```js
 * $('li').filter('.orange').attr('class');
 * //=> orange
 * ```
 *
 * @example <caption>Function</caption>
 *
 * ```js
 * $('li')
 *   .filter(function (i, el) {
 *     // this === el
 *     return $(this).attr('class') === 'orange';
 *   })
 *   .attr('class'); //=> orange
 * ```
 *
 * @param match - Value to look for, following the rules above. See
 *   {@link AcceptedFilters}.
 * @returns The filtered collection.
 * @see {@link https://api.jquery.com/filter/}
 */
export function filter<T, S extends AcceptedFilters<T>>(
  this: Cheerio<T>,
  match: S,
): Cheerio<S extends string ? Element : T>;
export function filter<T>(
  this: Cheerio<T>,
  match: AcceptedFilters<T>,
): Cheerio<unknown> {
  return this._make<unknown>(
    filterArray(this.toArray(), match, this.options.xmlMode, this._root?.[0]),
  );
}

export function filterArray<T>(
  nodes: T[],
  match: AcceptedFilters<T>,
  xmlMode?: boolean,
  root?: Document,
): Element[] | T[] {
  return typeof match === 'string'
    ? select.filter(match, nodes as unknown as AnyNode[], { xmlMode, root })
    : nodes.filter(getFilterFn<T>(match));
}

/**
 * Checks the current list of elements and returns `true` if _any_ of the
 * elements match the selector. If using an element or Cheerio selection,
 * returns `true` if _any_ of the elements match. If using a predicate function,
 * the function is executed in the context of the selected element, so `this`
 * refers to the current element.
 *
 * @category Traversing
 * @param selector - Selector for the selection.
 * @returns Whether or not the selector matches an element of the instance.
 * @see {@link https://api.jquery.com/is/}
 */
export function is<T>(
  this: Cheerio<T>,
  selector?: AcceptedFilters<T>,
): boolean {
  const nodes = this.toArray();
  return typeof selector === 'string'
    ? select.some(
        (nodes as unknown as AnyNode[]).filter(isTag),
        selector,
        this.options,
      )
    : selector
      ? nodes.some(getFilterFn<T>(selector))
      : false;
}

/**
 * Remove elements from the set of matched elements. Given a Cheerio object that
 * represents a set of DOM elements, the `.not()` method constructs a new
 * Cheerio object from a subset of the matching elements. The supplied selector
 * is tested against each element; the elements that don't match the selector
 * will be included in the result.
 *
 * The `.not()` method can take a function as its argument in the same way that
 * `.filter()` does. Elements for which the function returns `true` are excluded
 * from the filtered set; all other elements are included.
 *
 * @category Traversing
 * @example <caption>Selector</caption>
 *
 * ```js
 * $('li').not('.apple').length;
 * //=> 2
 * ```
 *
 * @example <caption>Function</caption>
 *
 * ```js
 * $('li').not(function (i, el) {
 *   // this === el
 *   return $(this).attr('class') === 'orange';
 * }).length; //=> 2
 * ```
 *
 * @param match - Value to look for, following the rules above.
 * @returns The filtered collection.
 * @see {@link https://api.jquery.com/not/}
 */
export function not<T extends AnyNode>(
  this: Cheerio<T>,
  match: AcceptedFilters<T>,
): Cheerio<T> {
  let nodes = this.toArray();

  if (typeof match === 'string') {
    const matches = new Set<AnyNode>(select.filter(match, nodes, this.options));
    nodes = nodes.filter((el) => !matches.has(el));
  } else {
    const filterFn = getFilterFn(match);
    nodes = nodes.filter((el, i) => !filterFn(el, i));
  }

  return this._make(nodes);
}

/**
 * Filters the set of matched elements to only those which have the given DOM
 * element as a descendant or which have a descendant that matches the given
 * selector. Equivalent to `.filter(':has(selector)')`.
 *
 * @category Traversing
 * @example <caption>Selector</caption>
 *
 * ```js
 * $('ul').has('.pear').attr('id');
 * //=> fruits
 * ```
 *
 * @example <caption>Element</caption>
 *
 * ```js
 * $('ul').has($('.pear')[0]).attr('id');
 * //=> fruits
 * ```
 *
 * @param selectorOrHaystack - Element to look for.
 * @returns The filtered collection.
 * @see {@link https://api.jquery.com/has/}
 */
export function has(
  this: Cheerio<AnyNode | Element>,
  selectorOrHaystack: string | Cheerio<Element> | Element,
): Cheerio<AnyNode | Element> {
  return this.filter(
    typeof selectorOrHaystack === 'string'
      ? // Using the `:has` selector here short-circuits searches.
        `:has(${selectorOrHaystack})`
      : (_, el) => this._make(el).find(selectorOrHaystack).length > 0,
  );
}

/**
 * Will select the first element of a cheerio object.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').children().first().text();
 * //=> Apple
 * ```
 *
 * @returns The first element.
 * @see {@link https://api.jquery.com/first/}
 */
export function first<T extends AnyNode>(this: Cheerio<T>): Cheerio<T> {
  return this.length > 1 ? this._make(this[0]) : this;
}

/**
 * Will select the last element of a cheerio object.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('#fruits').children().last().text();
 * //=> Pear
 * ```
 *
 * @returns The last element.
 * @see {@link https://api.jquery.com/last/}
 */
export function last<T>(this: Cheerio<T>): Cheerio<T> {
  return this.length > 0 ? this._make(this[this.length - 1]) : this;
}

/**
 * Reduce the set of matched elements to the one at the specified index. Use
 * `.eq(-i)` to count backwards from the last selected element.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').eq(0).text();
 * //=> Apple
 *
 * $('li').eq(-1).text();
 * //=> Pear
 * ```
 *
 * @param i - Index of the element to select.
 * @returns The element at the `i`th position.
 * @see {@link https://api.jquery.com/eq/}
 */
export function eq<T>(this: Cheerio<T>, i: number): Cheerio<T> {
  i = +i;

  // Use the first identity optimization if possible
  if (i === 0 && this.length <= 1) return this;

  if (i < 0) i = this.length + i;
  return this._make(this[i] ?? []);
}

/**
 * Retrieve one of the elements matched by the Cheerio object, at the `i`th
 * position.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').get(0).tagName;
 * //=> li
 * ```
 *
 * @param i - Element to retrieve.
 * @returns The element at the `i`th position.
 * @see {@link https://api.jquery.com/get/}
 */
export function get<T>(this: Cheerio<T>, i: number): T | undefined;
/**
 * Retrieve all elements matched by the Cheerio object, as an array.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').get().length;
 * //=> 3
 * ```
 *
 * @returns All elements matched by the Cheerio object.
 * @see {@link https://api.jquery.com/get/}
 */
export function get<T>(this: Cheerio<T>): T[];
export function get<T>(this: Cheerio<T>, i?: number): T | T[] {
  if (i == null) {
    return this.toArray();
  }
  return this[i < 0 ? this.length + i : i];
}

/**
 * Retrieve all the DOM elements contained in the jQuery set as an array.
 *
 * @example
 *
 * ```js
 * $('li').toArray();
 * //=> [ {...}, {...}, {...} ]
 * ```
 *
 * @returns The contained items.
 */
export function toArray<T>(this: Cheerio<T>): T[] {
  return Array.prototype.slice.call(this);
}

/**
 * Search for a given element from among the matched elements.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.pear').index();
 * //=> 2 $('.orange').index('li');
 * //=> 1
 * $('.apple').index($('#fruit, li'));
 * //=> 1
 * ```
 *
 * @param selectorOrNeedle - Element to look for.
 * @returns The index of the element.
 * @see {@link https://api.jquery.com/index/}
 */
export function index<T extends AnyNode>(
  this: Cheerio<T>,
  selectorOrNeedle?: string | Cheerio<AnyNode> | AnyNode,
): number {
  let $haystack: Cheerio<AnyNode>;
  let needle: AnyNode;

  if (selectorOrNeedle == null) {
    $haystack = this.parent().children();
    needle = this[0];
  } else if (typeof selectorOrNeedle === 'string') {
    $haystack = this._make<AnyNode>(selectorOrNeedle);
    needle = this[0];
  } else {
    // eslint-disable-next-line @typescript-eslint/no-this-alias, unicorn/no-this-assignment
    $haystack = this;
    needle = isCheerio(selectorOrNeedle)
      ? selectorOrNeedle[0]
      : selectorOrNeedle;
  }

  return Array.prototype.indexOf.call($haystack, needle);
}

/**
 * Gets the elements matching the specified range (0-based position).
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').slice(1).eq(0).text();
 * //=> 'Orange'
 *
 * $('li').slice(1, 2).length;
 * //=> 1
 * ```
 *
 * @param start - A position at which the elements begin to be selected. If
 *   negative, it indicates an offset from the end of the set.
 * @param end - A position at which the elements stop being selected. If
 *   negative, it indicates an offset from the end of the set. If omitted, the
 *   range continues until the end of the set.
 * @returns The elements matching the specified range.
 * @see {@link https://api.jquery.com/slice/}
 */
export function slice<T>(
  this: Cheerio<T>,
  start?: number,
  end?: number,
): Cheerio<T> {
  return this._make(Array.prototype.slice.call(this, start, end));
}

/**
 * End the most recent filtering operation in the current chain and return the
 * set of matched elements to its previous state.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').eq(0).end().length;
 * //=> 3
 * ```
 *
 * @returns The previous state of the set of matched elements.
 * @see {@link https://api.jquery.com/end/}
 */
export function end<T>(this: Cheerio<T>): Cheerio<AnyNode> {
  return this.prevObject ?? this._make([]);
}

/**
 * Add elements to the set of matched elements.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('.apple').add('.orange').length;
 * //=> 2
 * ```
 *
 * @param other - Elements to add.
 * @param context - Optionally the context of the new selection.
 * @returns The combined set.
 * @see {@link https://api.jquery.com/add/}
 */
export function add<S extends AnyNode, T extends AnyNode>(
  this: Cheerio<T>,
  other: string | Cheerio<S> | S | S[],
  context?: Cheerio<S> | string,
): Cheerio<S | T> {
  const selection = this._make(other, context);
  const contents = uniqueSort([...this.get(), ...selection.get()]);
  return this._make(contents);
}

/**
 * Add the previous set of elements on the stack to the current set, optionally
 * filtered by a selector.
 *
 * @category Traversing
 * @example
 *
 * ```js
 * $('li').eq(0).addBack('.orange').length;
 * //=> 2
 * ```
 *
 * @param selector - Selector for the elements to add.
 * @returns The combined set.
 * @see {@link https://api.jquery.com/addBack/}
 */
export function addBack<T extends AnyNode>(
  this: Cheerio<T>,
  selector?: string,
): Cheerio<AnyNode> {
  return this.prevObject
    ? this.add(selector ? this.prevObject.filter(selector) : this.prevObject)
    : this;
}
