import { cloneNode, Document } from 'domhandler';
/**
 * Check if the DOM element is a tag.
 *
 * `isTag(type)` includes `<script>` and `<style>` tags.
 *
 * @private
 * @category Utils
 * @param type - The DOM node to check.
 * @returns Whether the node is a tag.
 */
export { isTag } from 'domhandler';
/**
 * Checks if an object is a Cheerio instance.
 *
 * @category Utils
 * @param maybeCheerio - The object to check.
 * @returns Whether the object is a Cheerio instance.
 */
export function isCheerio(maybeCheerio) {
    return maybeCheerio.cheerio != null;
}
/**
 * Convert a string to camel case notation.
 *
 * @private
 * @category Utils
 * @param str - The string to be converted.
 * @returns String in camel case notation.
 */
export function camelCase(str) {
    return str.replace(/[_.-](\w|$)/g, (_, x) => x.toUpperCase());
}
/**
 * Convert a string from camel case to "CSS case", where word boundaries are
 * described by hyphens ("-") and all characters are lower-case.
 *
 * @private
 * @category Utils
 * @param str - The string to be converted.
 * @returns String in "CSS case".
 */
export function cssCase(str) {
    return str.replace(/[A-Z]/g, '-$&').toLowerCase();
}
/**
 * Iterate over each DOM element without creating intermediary Cheerio instances.
 *
 * This is indented for use internally to avoid otherwise unnecessary memory
 * pressure introduced by _make.
 *
 * @category Utils
 * @param array - The array to iterate over.
 * @param fn - Function to call.
 * @returns The original instance.
 */
export function domEach(array, fn) {
    const len = array.length;
    for (let i = 0; i < len; i++)
        fn(array[i], i);
    return array;
}
/**
 * Create a deep copy of the given DOM structure. Sets the parents of the copies
 * of the passed nodes to `null`.
 *
 * @private
 * @category Utils
 * @param dom - The domhandler-compliant DOM structure.
 * @returns - The cloned DOM.
 */
export function cloneDom(dom) {
    const clone = 'length' in dom
        ? Array.prototype.map.call(dom, (el) => cloneNode(el, true))
        : [cloneNode(dom, true)];
    // Add a root node around the cloned nodes
    const root = new Document(clone);
    clone.forEach((node) => {
        node.parent = root;
    });
    return clone;
}
var CharacterCodes;
(function (CharacterCodes) {
    CharacterCodes[CharacterCodes["LowerA"] = 97] = "LowerA";
    CharacterCodes[CharacterCodes["LowerZ"] = 122] = "LowerZ";
    CharacterCodes[CharacterCodes["UpperA"] = 65] = "UpperA";
    CharacterCodes[CharacterCodes["UpperZ"] = 90] = "UpperZ";
    CharacterCodes[CharacterCodes["Exclamation"] = 33] = "Exclamation";
})(CharacterCodes || (CharacterCodes = {}));
/**
 * Check if string is HTML.
 *
 * Tests for a `<` within a string, immediate followed by a letter and
 * eventually followed by a `>`.
 *
 * @private
 * @category Utils
 * @param str - The string to check.
 * @returns Indicates if `str` is HTML.
 */
export function isHtml(str) {
    const tagStart = str.indexOf('<');
    if (tagStart < 0 || tagStart > str.length - 3)
        return false;
    const tagChar = str.charCodeAt(tagStart + 1);
    return (((tagChar >= CharacterCodes.LowerA && tagChar <= CharacterCodes.LowerZ) ||
        (tagChar >= CharacterCodes.UpperA && tagChar <= CharacterCodes.UpperZ) ||
        tagChar === CharacterCodes.Exclamation) &&
        str.includes('>', tagStart + 2));
}
//# sourceMappingURL=utils.js.map