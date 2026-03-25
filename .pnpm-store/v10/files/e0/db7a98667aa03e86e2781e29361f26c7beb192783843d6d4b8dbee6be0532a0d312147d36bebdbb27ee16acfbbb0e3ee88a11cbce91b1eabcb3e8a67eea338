function getExtractDescr(descr) {
    var _a;
    if (typeof descr === 'string') {
        return { selector: descr, value: 'textContent' };
    }
    return {
        selector: descr.selector,
        value: (_a = descr.value) !== null && _a !== void 0 ? _a : 'textContent',
    };
}
/**
 * Extract multiple values from a document, and store them in an object.
 *
 * @param map - An object containing key-value pairs. The keys are the names of
 *   the properties to be created on the object, and the values are the
 *   selectors to be used to extract the values.
 * @returns An object containing the extracted values.
 */
export function extract(map) {
    const ret = {};
    for (const key in map) {
        const descr = map[key];
        const isArray = Array.isArray(descr);
        const { selector, value } = getExtractDescr(isArray ? descr[0] : descr);
        const fn = typeof value === 'function'
            ? value
            : typeof value === 'string'
                ? (el) => this._make(el).prop(value)
                : (el) => this._make(el).extract(value);
        if (isArray) {
            ret[key] = this._findBySelector(selector, Number.POSITIVE_INFINITY)
                .map((_, el) => fn(el, key, ret))
                .get();
        }
        else {
            const $ = this._findBySelector(selector, 1);
            ret[key] = $.length > 0 ? fn($[0], key, ret) : undefined;
        }
    }
    return ret;
}
//# sourceMappingURL=extract.js.map