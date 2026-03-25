import { domEach } from '../utils.js';
import { isTag } from 'domhandler';
/**
 * Set multiple CSS properties for every matched element.
 *
 * @category CSS
 * @param prop - The names of the properties.
 * @param val - The new values.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/css/}
 */
export function css(prop, val) {
    if ((prop != null && val != null) ||
        // When `prop` is a "plain" object
        (typeof prop === 'object' && !Array.isArray(prop))) {
        return domEach(this, (el, i) => {
            if (isTag(el)) {
                // `prop` can't be an array here anymore.
                setCss(el, prop, val, i);
            }
        });
    }
    if (this.length === 0) {
        return undefined;
    }
    return getCss(this[0], prop);
}
/**
 * Set styles of all elements.
 *
 * @private
 * @param el - Element to set style of.
 * @param prop - Name of property.
 * @param value - Value to set property to.
 * @param idx - Optional index within the selection.
 */
function setCss(el, prop, value, idx) {
    if (typeof prop === 'string') {
        const styles = getCss(el);
        const val = typeof value === 'function' ? value.call(el, idx, styles[prop]) : value;
        if (val === '') {
            delete styles[prop];
        }
        else if (val != null) {
            styles[prop] = val;
        }
        el.attribs['style'] = stringify(styles);
    }
    else if (typeof prop === 'object') {
        const keys = Object.keys(prop);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            setCss(el, k, prop[k], i);
        }
    }
}
function getCss(el, prop) {
    if (!el || !isTag(el))
        return;
    const styles = parse(el.attribs['style']);
    if (typeof prop === 'string') {
        return styles[prop];
    }
    if (Array.isArray(prop)) {
        const newStyles = {};
        for (const item of prop) {
            if (styles[item] != null) {
                newStyles[item] = styles[item];
            }
        }
        return newStyles;
    }
    return styles;
}
/**
 * Stringify `obj` to styles.
 *
 * @private
 * @category CSS
 * @param obj - Object to stringify.
 * @returns The serialized styles.
 */
function stringify(obj) {
    return Object.keys(obj).reduce((str, prop) => `${str}${str ? ' ' : ''}${prop}: ${obj[prop]};`, '');
}
/**
 * Parse `styles`.
 *
 * @private
 * @category CSS
 * @param styles - Styles to be parsed.
 * @returns The parsed styles.
 */
function parse(styles) {
    styles = (styles || '').trim();
    if (!styles)
        return {};
    const obj = {};
    let key;
    for (const str of styles.split(';')) {
        const n = str.indexOf(':');
        // If there is no :, or if it is the first/last character, add to the previous item's value
        if (n < 1 || n === str.length - 1) {
            const trimmed = str.trimEnd();
            if (trimmed.length > 0 && key !== undefined) {
                obj[key] += `;${trimmed}`;
            }
        }
        else {
            key = str.slice(0, n).trim();
            obj[key] = str.slice(n + 1).trim();
        }
    }
    return obj;
}
//# sourceMappingURL=css.js.map