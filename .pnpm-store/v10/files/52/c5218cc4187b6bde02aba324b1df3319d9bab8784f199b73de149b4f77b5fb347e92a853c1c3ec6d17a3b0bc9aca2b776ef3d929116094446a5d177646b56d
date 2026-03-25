/**
 * Methods for getting and modifying attributes.
 *
 * @module cheerio/attributes
 */
import { type AnyNode, type Element } from 'domhandler';
import type { Cheerio } from '../cheerio.js';
/**
 * Method for getting attributes. Gets the attribute value for only the first
 * element in the matched set.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('ul').attr('id');
 * //=> fruits
 * ```
 *
 * @param name - Name of the attribute.
 * @returns The attribute's value.
 * @see {@link https://api.jquery.com/attr/}
 */
export declare function attr<T extends AnyNode>(this: Cheerio<T>, name: string): string | undefined;
/**
 * Method for getting all attributes and their values of the first element in
 * the matched set.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('ul').attr();
 * //=> { id: 'fruits' }
 * ```
 *
 * @returns The attribute's values.
 * @see {@link https://api.jquery.com/attr/}
 */
export declare function attr<T extends AnyNode>(this: Cheerio<T>): Record<string, string> | undefined;
/**
 * Method for setting attributes. Sets the attribute value for only the first
 * element in the matched set. If you set an attribute's value to `null`, you
 * remove that attribute. You may also pass a `map` and `function`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.apple').attr('id', 'favorite').html();
 * //=> <li class="apple" id="favorite">Apple</li>
 * ```
 *
 * @param name - Name of the attribute.
 * @param value - The new value of the attribute.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/attr/}
 */
export declare function attr<T extends AnyNode>(this: Cheerio<T>, name: string, value?: string | null | ((this: Element, i: number, attrib: string) => string | null)): Cheerio<T>;
/**
 * Method for setting multiple attributes at once. Sets the attribute value for
 * only the first element in the matched set. If you set an attribute's value to
 * `null`, you remove that attribute.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.apple').attr({ id: 'favorite' }).html();
 * //=> <li class="apple" id="favorite">Apple</li>
 * ```
 *
 * @param values - Map of attribute names and values.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/attr/}
 */
export declare function attr<T extends AnyNode>(this: Cheerio<T>, values: Record<string, string | null>): Cheerio<T>;
interface StyleProp {
    length: number;
    [key: string]: string | number;
    [index: number]: string;
}
/**
 * Method for getting and setting properties. Gets the property value for only
 * the first element in the matched set.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('input[type="checkbox"]').prop('checked');
 * //=> false
 *
 * $('input[type="checkbox"]').prop('checked', true).val();
 * //=> ok
 * ```
 *
 * @param name - Name of the property.
 * @returns If `value` is specified the instance itself, otherwise the prop's
 *   value.
 * @see {@link https://api.jquery.com/prop/}
 */
export declare function prop<T extends AnyNode>(this: Cheerio<T>, name: 'tagName' | 'nodeName'): string | undefined;
export declare function prop<T extends AnyNode>(this: Cheerio<T>, name: 'innerHTML' | 'outerHTML' | 'innerText' | 'textContent'): string | null;
/**
 * Get a parsed CSS style object.
 *
 * @param name - Name of the property.
 * @returns The style object, or `undefined` if the element has no `style`
 *   attribute.
 */
export declare function prop<T extends AnyNode>(this: Cheerio<T>, name: 'style'): StyleProp | undefined;
/**
 * Resolve `href` or `src` of supported elements. Requires the `baseURI` option
 * to be set, and a global `URL` object to be part of the environment.
 *
 * @example With `baseURI` set to `'https://example.com'`:
 *
 * ```js
 * $('<img src="image.png">').prop('src');
 * //=> 'https://example.com/image.png'
 * ```
 *
 * @param name - Name of the property.
 * @returns The resolved URL, or `undefined` if the element is not supported.
 */
export declare function prop<T extends AnyNode>(this: Cheerio<T>, name: 'href' | 'src'): string | undefined;
/**
 * Get a property of an element.
 *
 * @param name - Name of the property.
 * @returns The property's value.
 */
export declare function prop<T extends AnyNode, K extends keyof Element>(this: Cheerio<T>, name: K): Element[K];
/**
 * Set a property of an element.
 *
 * @param name - Name of the property.
 * @param value - Value to set the property to.
 * @returns The instance itself.
 */
export declare function prop<T extends AnyNode, K extends keyof Element>(this: Cheerio<T>, name: K, value: Element[K] | ((this: Element, i: number, prop: K) => Element[keyof Element])): Cheerio<T>;
/**
 * Set multiple properties of an element.
 *
 * @example
 *
 * ```js
 * $('input[type="checkbox"]').prop({
 *   checked: true,
 *   disabled: false,
 * });
 * ```
 *
 * @param map - Object of properties to set.
 * @returns The instance itself.
 */
export declare function prop<T extends AnyNode>(this: Cheerio<T>, map: Record<string, string | Element[keyof Element] | boolean>): Cheerio<T>;
/**
 * Set a property of an element.
 *
 * @param name - Name of the property.
 * @param value - Value to set the property to.
 * @returns The instance itself.
 */
export declare function prop<T extends AnyNode>(this: Cheerio<T>, name: string, value: string | boolean | null | ((this: Element, i: number, prop: string) => string | boolean)): Cheerio<T>;
/**
 * Get a property of an element.
 *
 * @param name - The property's name.
 * @returns The property's value.
 */
export declare function prop<T extends AnyNode>(this: Cheerio<T>, name: string): string;
/**
 * Method for getting data attributes, for only the first element in the matched
 * set.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('<div data-apple-color="red"></div>').data('apple-color');
 * //=> 'red'
 * ```
 *
 * @param name - Name of the data attribute.
 * @returns The data attribute's value, or `undefined` if the attribute does not
 *   exist.
 * @see {@link https://api.jquery.com/data/}
 */
export declare function data<T extends AnyNode>(this: Cheerio<T>, name: string): unknown | undefined;
/**
 * Method for getting all of an element's data attributes, for only the first
 * element in the matched set.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('<div data-apple-color="red"></div>').data();
 * //=> { appleColor: 'red' }
 * ```
 *
 * @returns A map with all of the data attributes.
 * @see {@link https://api.jquery.com/data/}
 */
export declare function data<T extends AnyNode>(this: Cheerio<T>): Record<string, unknown>;
/**
 * Method for setting data attributes, for only the first element in the matched
 * set.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * const apple = $('.apple').data('kind', 'mac');
 *
 * apple.data('kind');
 * //=> 'mac'
 * ```
 *
 * @param name - Name of the data attribute.
 * @param value - The new value.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/data/}
 */
export declare function data<T extends AnyNode>(this: Cheerio<T>, name: string, value: unknown): Cheerio<T>;
/**
 * Method for setting multiple data attributes at once, for only the first
 * element in the matched set.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * const apple = $('.apple').data({ kind: 'mac' });
 *
 * apple.data('kind');
 * //=> 'mac'
 * ```
 *
 * @param values - Map of names to values.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/data/}
 */
export declare function data<T extends AnyNode>(this: Cheerio<T>, values: Record<string, unknown>): Cheerio<T>;
/**
 * Method for getting the value of input, select, and textarea. Note: Support
 * for `map`, and `function` has not been added yet.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('input[type="text"]').val();
 * //=> input_text
 * ```
 *
 * @returns The value.
 * @see {@link https://api.jquery.com/val/}
 */
export declare function val<T extends AnyNode>(this: Cheerio<T>): string | undefined | string[];
/**
 * Method for setting the value of input, select, and textarea. Note: Support
 * for `map`, and `function` has not been added yet.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('input[type="text"]').val('test').html();
 * //=> <input type="text" value="test"/>
 * ```
 *
 * @param value - The new value.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/val/}
 */
export declare function val<T extends AnyNode>(this: Cheerio<T>, value: string | string[]): Cheerio<T>;
/**
 * Method for removing attributes by `name`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.pear').removeAttr('class').html();
 * //=> <li>Pear</li>
 *
 * $('.apple').attr('id', 'favorite');
 * $('.apple').removeAttr('id class').html();
 * //=> <li>Apple</li>
 * ```
 *
 * @param name - Name of the attribute.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/removeAttr/}
 */
export declare function removeAttr<T extends AnyNode>(this: Cheerio<T>, name: string): Cheerio<T>;
/**
 * Check to see if _any_ of the matched elements have the given `className`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.pear').hasClass('pear');
 * //=> true
 *
 * $('apple').hasClass('fruit');
 * //=> false
 *
 * $('li').hasClass('pear');
 * //=> true
 * ```
 *
 * @param className - Name of the class.
 * @returns Indicates if an element has the given `className`.
 * @see {@link https://api.jquery.com/hasClass/}
 */
export declare function hasClass<T extends AnyNode>(this: Cheerio<T>, className: string): boolean;
/**
 * Adds class(es) to all of the matched elements. Also accepts a `function`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.pear').addClass('fruit').html();
 * //=> <li class="pear fruit">Pear</li>
 *
 * $('.apple').addClass('fruit red').html();
 * //=> <li class="apple fruit red">Apple</li>
 * ```
 *
 * @param value - Name of new class.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/addClass/}
 */
export declare function addClass<T extends AnyNode, R extends ArrayLike<T>>(this: R, value?: string | ((this: Element, i: number, className: string) => string | undefined)): R;
/**
 * Removes one or more space-separated classes from the selected elements. If no
 * `className` is defined, all classes will be removed. Also accepts a
 * `function`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.pear').removeClass('pear').html();
 * //=> <li class="">Pear</li>
 *
 * $('.apple').addClass('red').removeClass().html();
 * //=> <li class="">Apple</li>
 * ```
 *
 * @param name - Name of the class. If not specified, removes all elements.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/removeClass/}
 */
export declare function removeClass<T extends AnyNode, R extends ArrayLike<T>>(this: R, name?: string | ((this: Element, i: number, className: string) => string | undefined)): R;
/**
 * Add or remove class(es) from the matched elements, depending on either the
 * class's presence or the value of the switch argument. Also accepts a
 * `function`.
 *
 * @category Attributes
 * @example
 *
 * ```js
 * $('.apple.green').toggleClass('fruit green red').html();
 * //=> <li class="apple fruit red">Apple</li>
 *
 * $('.apple.green').toggleClass('fruit green red', true).html();
 * //=> <li class="apple green fruit red">Apple</li>
 * ```
 *
 * @param value - Name of the class. Can also be a function.
 * @param stateVal - If specified the state of the class.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/toggleClass/}
 */
export declare function toggleClass<T extends AnyNode, R extends ArrayLike<T>>(this: R, value?: string | ((this: Element, i: number, className: string, stateVal?: boolean) => string), stateVal?: boolean): R;
export {};
//# sourceMappingURL=attributes.d.ts.map