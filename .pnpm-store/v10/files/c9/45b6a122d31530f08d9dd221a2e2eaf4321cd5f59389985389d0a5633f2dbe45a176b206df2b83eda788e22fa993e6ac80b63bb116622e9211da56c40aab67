/**
 * @private
 *
 * @param jsJoda
 * @returns { function(jsJoda: JsJoda) }
 */
export function bindUse(jsJoda) {
    const used = [];

    /**
     * use
     *
     * Provides a way to extend the internals of js-joda
     *
     * @param {function} fn - function to extend js-joda public api
     * @returns {this} for chaining
     */
    return function use(fn) {
        if (!~used.indexOf(fn)) {
            fn(jsJoda);
            used.push(fn);
        }
        return jsJoda;
    };
}
