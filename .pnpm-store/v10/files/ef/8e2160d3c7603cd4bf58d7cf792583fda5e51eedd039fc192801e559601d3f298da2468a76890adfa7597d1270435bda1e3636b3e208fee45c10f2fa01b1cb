"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenOptions = flattenOptions;
const defaultOpts = {
    _useHtmlParser2: false,
};
/**
 * Flatten the options for Cheerio.
 *
 * This will set `_useHtmlParser2` to true if `xml` is set to true.
 *
 * @param options - The options to flatten.
 * @param baseOptions - The base options to use.
 * @returns The flattened options.
 */
function flattenOptions(options, baseOptions) {
    if (!options) {
        return baseOptions !== null && baseOptions !== void 0 ? baseOptions : defaultOpts;
    }
    const opts = {
        _useHtmlParser2: !!options.xmlMode,
        ...baseOptions,
        ...options,
    };
    if (options.xml) {
        opts._useHtmlParser2 = true;
        opts.xmlMode = true;
        if (options.xml !== true) {
            Object.assign(opts, options.xml);
        }
    }
    else if (options.xmlMode) {
        opts._useHtmlParser2 = true;
    }
    return opts;
}
//# sourceMappingURL=options.js.map