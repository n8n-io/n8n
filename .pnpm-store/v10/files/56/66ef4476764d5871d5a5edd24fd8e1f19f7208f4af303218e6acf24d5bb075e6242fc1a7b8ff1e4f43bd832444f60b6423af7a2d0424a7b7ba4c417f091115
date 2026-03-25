'use strict';
/** @module cheerio/css */

var domEach = require('../utils').domEach;

var toString = Object.prototype.toString;

/**
 * Get the value of a style property for the first element in the set of matched
 * elements or set one or more CSS properties for every matched element.
 *
 * @param {string | object} prop - The name of the property.
 * @param {string} [val] - If specified the new value.
 * @returns {Cheerio} The instance itself.
 * @see {@link https://api.jquery.com/css/}
 */
exports.css = function (prop, val) {
  if (
    arguments.length === 2 ||
    // When `prop` is a "plain" object
    toString.call(prop) === '[object Object]'
  ) {
    return domEach(this, function (idx, el) {
      setCss(el, prop, val, idx);
    });
  }
  return getCss(this[0], prop);
};

/**
 * Set styles of all elements.
 *
 * @private
 * @param {Element} el - Element to set style of.
 * @param {string | object} prop - Name of property.
 * @param {string | Function} val - Value to set property to.
 * @param {number} [idx] - Optional index within the selection.
 */
function setCss(el, prop, val, idx) {
  if (typeof prop === 'string') {
    var styles = getCss(el);
    if (typeof val === 'function') {
      val = val.call(el, idx, styles[prop]);
    }

    if (val === '') {
      delete styles[prop];
    } else if (val != null) {
      styles[prop] = val;
    }

    el.attribs.style = stringify(styles);
  } else if (typeof prop === 'object') {
    Object.keys(prop).forEach(function (k) {
      setCss(el, k, prop[k]);
    });
  }
}

/**
 * Get parsed styles of the first element.
 *
 * @private
 * @param {Element} el - Element to get styles from.
 * @param {string | string[]} [prop] - Name of the prop.
 * @returns {object | undefined} The parsed styles.
 */
function getCss(el, prop) {
  if (!el || !el.attribs) return;

  var styles = parse(el.attribs.style);
  if (typeof prop === 'string') {
    return styles[prop];
  }
  if (Array.isArray(prop)) {
    var newStyles = {};
    prop.forEach(function (item) {
      if (styles[item] != null) {
        newStyles[item] = styles[item];
      }
    });
    return newStyles;
  }
  return styles;
}

/**
 * Stringify `obj` to styles.
 *
 * @private
 * @param {object} obj - Object to stringify.
 * @returns {string} The serialized styles.
 */
function stringify(obj) {
  return Object.keys(obj || {}).reduce(function (str, prop) {
    return (str += '' + (str ? ' ' : '') + prop + ': ' + obj[prop] + ';');
  }, '');
}

/**
 * Parse `styles`.
 *
 * @private
 * @param {string} styles - Styles to be parsed.
 * @returns {object} The parsed styles.
 */
function parse(styles) {
  styles = (styles || '').trim();

  if (!styles) return {};

  return styles.split(';').reduce(function (obj, str) {
    var n = str.indexOf(':');
    // skip if there is no :, or if it is the first/last character
    if (n < 1 || n === str.length - 1) return obj;
    obj[str.slice(0, n).trim()] = str.slice(n + 1).trim();
    return obj;
  }, {});
}
