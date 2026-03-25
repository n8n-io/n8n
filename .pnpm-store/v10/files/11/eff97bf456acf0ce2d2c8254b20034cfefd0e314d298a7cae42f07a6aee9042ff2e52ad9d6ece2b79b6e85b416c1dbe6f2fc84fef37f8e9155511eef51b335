const defaultOpts = {
    xml: false,
    decodeEntities: true,
};
/** Cheerio default options. */
export default defaultOpts;
const xmlModeDefault = {
    _useHtmlParser2: true,
    xmlMode: true,
};
/**
 * Flatten the options for Cheerio.
 *
 * This will set `_useHtmlParser2` to true if `xml` is set to true.
 *
 * @param options - The options to flatten.
 * @returns The flattened options.
 */
export function flatten(options) {
    return (options === null || options === void 0 ? void 0 : options.xml)
        ? typeof options.xml === 'boolean'
            ? xmlModeDefault
            : { ...xmlModeDefault, ...options.xml }
        : options !== null && options !== void 0 ? options : undefined;
}
//# sourceMappingURL=options.js.map