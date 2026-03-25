"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.css = void 0;
var utils_js_1 = require("../utils.js");
/**
 * Set multiple CSS properties for every matched element.
 *
 * @category CSS
 * @param prop - The names of the properties.
 * @param val - The new values.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/css/}
 */
function css(prop, val) {
    if ((prop != null && val != null) ||
        // When `prop` is a "plain" object
        (typeof prop === 'object' && !Array.isArray(prop))) {
        return (0, utils_js_1.domEach)(this, function (el, i) {
            if ((0, utils_js_1.isTag)(el)) {
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
exports.css = css;
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
        var styles = getCss(el);
        var val = typeof value === 'function' ? value.call(el, idx, styles[prop]) : value;
        if (val === '') {
            delete styles[prop];
        }
        else if (val != null) {
            styles[prop] = val;
        }
        el.attribs['style'] = stringify(styles);
    }
    else if (typeof prop === 'object') {
        Object.keys(prop).forEach(function (k, i) {
            setCss(el, k, prop[k], i);
        });
    }
}
function getCss(el, prop) {
    if (!el || !(0, utils_js_1.isTag)(el))
        return;
    var styles = parse(el.attribs['style']);
    if (typeof prop === 'string') {
        return styles[prop];
    }
    if (Array.isArray(prop)) {
        var newStyles_1 = {};
        prop.forEach(function (item) {
            if (styles[item] != null) {
                newStyles_1[item] = styles[item];
            }
        });
        return newStyles_1;
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
    return Object.keys(obj).reduce(function (str, prop) { return "".concat(str).concat(str ? ' ' : '').concat(prop, ": ").concat(obj[prop], ";"); }, '');
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
    var obj = {};
    var key;
    for (var _i = 0, _a = styles.split(';'); _i < _a.length; _i++) {
        var str = _a[_i];
        var n = str.indexOf(':');
        // If there is no :, or if it is the first/last character, add to the previous item's value
        if (n < 1 || n === str.length - 1) {
            var trimmed = str.trimEnd();
            if (trimmed.length > 0 && key !== undefined) {
                obj[key] += ";".concat(trimmed);
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