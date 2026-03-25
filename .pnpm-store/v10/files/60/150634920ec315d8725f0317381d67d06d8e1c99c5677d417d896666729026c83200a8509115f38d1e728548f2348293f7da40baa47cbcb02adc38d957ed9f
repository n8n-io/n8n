/**
 * Converts string into camelCase.
 *
 * @see http://stackoverflow.com/questions/2970525/converting-any-string-into-camel-case
 */
export declare function camelCase(str: string, firstCapital?: boolean): string;
/**
 * Converts string into snake_case.
 *
 */
export declare function snakeCase(str: string): string;
/**
 * Converts string into Title Case.
 *
 * @see http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
 */
export declare function titleCase(str: string): string;
/**
 * Builds abbreviated string from given string;
 */
export declare function abbreviate(str: string, abbrLettersCount?: number): string;
export interface IShortenOptions {
    /** String used to split "segments" of the alias/column name */
    separator?: string;
    /** Maximum length of any "segment" */
    segmentLength?: number;
    /** Length of any "term" in a "segment"; "OrderItem" is a segment, "Order" and "Items" are terms */
    termLength?: number;
}
/**
 * Shorten a given `input`. Useful for RDBMS imposing a limit on the
 * maximum length of aliases and column names in SQL queries.
 *
 * @param input String to be shortened.
 * @param options Default to `4` for segments length, `2` for terms length, `'__'` as a separator.
 *
 * @return Shortened `input`.
 *
 * @example
 * // returns: "UsShCa__orde__mark__dire"
 * shorten('UserShoppingCart__order__market__director')
 *
 * // returns: "cat_wit_ver_lon_nam_pos_wit_ver_lon_nam_pos_wit_ver_lon_nam"
 * shorten(
 *   'category_with_very_long_name_posts_with_very_long_name_post_with_very_long_name',
 *   { separator: '_', segmentLength: 3 }
 * )
 *
 * // equals: UsShCa__orde__mark_market_id
 * `${shorten('UserShoppingCart__order__market')}_market_id`
 */
export declare function shorten(input: string, options?: IShortenOptions): string;
interface IHashOptions {
    length?: number;
}
/**
 * Returns a hashed input.
 *
 * @param input String to be hashed.
 * @param options.length Optionally, shorten the output to desired length.
 */
export declare function hash(input: string, options?: IHashOptions): string;
export {};
