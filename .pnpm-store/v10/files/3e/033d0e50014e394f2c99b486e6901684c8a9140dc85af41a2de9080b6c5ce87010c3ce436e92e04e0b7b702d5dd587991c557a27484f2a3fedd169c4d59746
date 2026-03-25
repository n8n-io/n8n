'use strict';

/**
 * @typedef {import('../../lib/types').XastElement} XastElement
 * @typedef {import('../types').PathDataCommand} PathDataCommand
 * @typedef {import('../types').DataUri} DataUri
 */

const { attrsGroups, referencesProps } = require('../../plugins/_collections');

const regReferencesUrl = /\burl\((["'])?#(.+?)\1\)/g;
const regReferencesHref = /^#(.+?)$/;
const regReferencesBegin = /(\w+)\.[a-zA-Z]/;

/**
 * Encode plain SVG data string into Data URI string.
 *
 * @type {(str: string, type?: DataUri) => string}
 */
exports.encodeSVGDatauri = (str, type) => {
  var prefix = 'data:image/svg+xml';
  if (!type || type === 'base64') {
    // base64
    prefix += ';base64,';
    str = prefix + Buffer.from(str).toString('base64');
  } else if (type === 'enc') {
    // URI encoded
    str = prefix + ',' + encodeURIComponent(str);
  } else if (type === 'unenc') {
    // unencoded
    str = prefix + ',' + str;
  }
  return str;
};

/**
 * Decode SVG Data URI string into plain SVG string.
 *
 * @type {(str: string) => string}
 */
exports.decodeSVGDatauri = (str) => {
  var regexp = /data:image\/svg\+xml(;charset=[^;,]*)?(;base64)?,(.*)/;
  var match = regexp.exec(str);

  // plain string
  if (!match) return str;

  var data = match[3];

  if (match[2]) {
    // base64
    str = Buffer.from(data, 'base64').toString('utf8');
  } else if (data.charAt(0) === '%') {
    // URI encoded
    str = decodeURIComponent(data);
  } else if (data.charAt(0) === '<') {
    // unencoded
    str = data;
  }
  return str;
};

/**
 * @typedef {{
 *   noSpaceAfterFlags?: boolean,
 *   leadingZero?: boolean,
 *   negativeExtraSpace?: boolean
 * }} CleanupOutDataParams
 */

/**
 * Convert a row of numbers to an optimized string view.
 *
 * @example
 * [0, -1, .5, .5] → "0-1 .5.5"
 *
 * @type {(data: number[], params: CleanupOutDataParams, command?: PathDataCommand) => string}
 */
exports.cleanupOutData = (data, params, command) => {
  let str = '';
  let delimiter;
  /**
   * @type {number}
   */
  let prev;

  data.forEach((item, i) => {
    // space delimiter by default
    delimiter = ' ';

    // no extra space in front of first number
    if (i == 0) delimiter = '';

    // no extra space after 'arcto' command flags(large-arc and sweep flags)
    // a20 60 45 0 1 30 20 → a20 60 45 0130 20
    if (params.noSpaceAfterFlags && (command == 'A' || command == 'a')) {
      var pos = i % 7;
      if (pos == 4 || pos == 5) delimiter = '';
    }

    // remove floating-point numbers leading zeros
    // 0.5 → .5
    // -0.5 → -.5
    const itemStr = params.leadingZero
      ? removeLeadingZero(item)
      : item.toString();

    // no extra space in front of negative number or
    // in front of a floating number if a previous number is floating too
    if (
      params.negativeExtraSpace &&
      delimiter != '' &&
      (item < 0 || (itemStr.charAt(0) === '.' && prev % 1 !== 0))
    ) {
      delimiter = '';
    }
    // save prev item value
    prev = item;
    str += delimiter + itemStr;
  });
  return str;
};

/**
 * Remove floating-point numbers leading zero.
 *
 * @param {number} value
 * @returns {string}
 * @example
 * 0.5 → .5
 * -0.5 → -.5
 */
const removeLeadingZero = (value) => {
  const strValue = value.toString();

  if (0 < value && value < 1 && strValue.startsWith('0')) {
    return strValue.slice(1);
  }

  if (-1 < value && value < 0 && strValue[1] === '0') {
    return strValue[0] + strValue.slice(2);
  }

  return strValue;
};
exports.removeLeadingZero = removeLeadingZero;

/**
 * If the current node contains any scripts. This does not check parents or
 * children of the node, only the properties and attributes of the node itself.
 *
 * @param {XastElement} node Current node to check against.
 * @returns {boolean} If the current node contains scripts.
 */
const hasScripts = (node) => {
  if (node.name === 'script' && node.children.length !== 0) {
    return true;
  }

  if (node.name === 'a') {
    const hasJsLinks = Object.entries(node.attributes).some(
      ([attrKey, attrValue]) =>
        (attrKey === 'href' || attrKey.endsWith(':href')) &&
        attrValue != null &&
        attrValue.trimStart().startsWith('javascript:'),
    );

    if (hasJsLinks) {
      return true;
    }
  }

  const eventAttrs = [
    ...attrsGroups.animationEvent,
    ...attrsGroups.documentEvent,
    ...attrsGroups.documentElementEvent,
    ...attrsGroups.globalEvent,
    ...attrsGroups.graphicalEvent,
  ];

  return eventAttrs.some((attr) => node.attributes[attr] != null);
};
exports.hasScripts = hasScripts;

/**
 * For example, a string that contains one or more of following would match and
 * return true:
 *
 * * `url(#gradient001)`
 * * `url('#gradient001')`
 *
 * @param {string} body
 * @returns {boolean} If the given string includes a URL reference.
 */
const includesUrlReference = (body) => {
  return new RegExp(regReferencesUrl).test(body);
};
exports.includesUrlReference = includesUrlReference;

/**
 * @param {string} attribute
 * @param {string} value
 * @returns {string[]}
 */
const findReferences = (attribute, value) => {
  const results = [];

  if (referencesProps.has(attribute)) {
    const matches = value.matchAll(regReferencesUrl);
    for (const match of matches) {
      results.push(match[2]);
    }
  }

  if (attribute === 'href' || attribute.endsWith(':href')) {
    const match = regReferencesHref.exec(value);
    if (match != null) {
      results.push(match[1]);
    }
  }

  if (attribute === 'begin') {
    const match = regReferencesBegin.exec(value);
    if (match != null) {
      results.push(match[1]);
    }
  }

  return results.map((body) => decodeURI(body));
};
exports.findReferences = findReferences;

/**
 * Does the same as {@link Number.toFixed} but without casting
 * the return value to a string.
 *
 * @param {number} num
 * @param {number} precision
 * @returns {number}
 */
const toFixed = (num, precision) => {
  const pow = 10 ** precision;
  return Math.round(num * pow) / pow;
};
exports.toFixed = toFixed;
