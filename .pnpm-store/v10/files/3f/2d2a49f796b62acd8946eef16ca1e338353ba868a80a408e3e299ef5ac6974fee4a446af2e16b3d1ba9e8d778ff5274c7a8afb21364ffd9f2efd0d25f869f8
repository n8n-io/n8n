'use strict';

/**
 * Module dependencies.
 */

var mensch = require('mensch');
var Selector = require('./selector');
var Property = require('./property');

exports.Selector = Selector;
exports.Property = Property;

/**
 * Returns an array of the selectors.
 *
 * @license Sizzle CSS Selector Engine - MIT
 * @param {String} selectorText from mensch
 * @api public
 */

exports.extract = function extract(selectorText) {
  var attr = 0;
  var sels = [];
  var sel = '';

  for (var i = 0, l = selectorText.length; i < l; i++) {
    var c = selectorText.charAt(i);

    if (attr) {
      if (']' === c || ')' === c) { attr--; }
      sel += c;
    } else {
      if (',' === c) {
        sels.push(sel);
        sel = '';
      } else {
        if ('[' === c || '(' === c) { attr++; }
        if (sel.length || (c !== ',' && c !== '\n' && c !== ' ')) { sel += c; }
      }
    }
  }

  if (sel.length) {
    sels.push(sel);
  }
  return sels;
};

/**
 * Returns a parse tree for a CSS source.
 * If it encounters multiple selectors separated by a comma, it splits the
 * tree.
 *
 * @param {String} css source
 * @api public
 */

exports.parseCSS = function(css) {
  var parsed = mensch.parse(css, {position: true, comments: true});
  var rules = typeof parsed.stylesheet != 'undefined' && parsed.stylesheet.rules ? parsed.stylesheet.rules : [];
  var ret = [];

  for (var i = 0, l = rules.length; i < l; i++) {
    if (rules[i].type == 'rule') {
      var rule = rules[i];
      var selectors = rule.selectors;

      for (var ii = 0, ll = selectors.length; ii < ll; ii++) {
        ret.push([selectors[ii], rule.declarations]);
      }
    }
  }

  return ret;
};

/**
 * Returns preserved text for a CSS source.
 *
 * @param {String} css source
 * @param {Object} options
 * @api public
 */

exports.getPreservedText = function(css, options, ignoredPseudos) {
  var parsed = mensch.parse(css, {position: true, comments: true});
  var rules = typeof parsed.stylesheet != 'undefined' && parsed.stylesheet.rules ? parsed.stylesheet.rules : [];
  var preserved = [];
  var lastStart = null;

  for (var i = rules.length - 1; i >= 0; i--) {
    if ((options.fontFaces && rules[i].type === 'font-face') ||
        (options.mediaQueries && rules[i].type === 'media') ||
        (options.keyFrames && rules[i].type === 'keyframes') ||
        (options.pseudos && rules[i].selectors && this.matchesPseudo(rules[i].selectors[0], ignoredPseudos))) {
      preserved.unshift(
        mensch.stringify(
          { stylesheet: { rules: [ rules[i] ] }},
          { comments: false, indentation: '  ' }
        )
      );
    }
    lastStart = rules[i].position.start;
  }

  if (preserved.length === 0) {
    return false;
  }
  return '\n' + preserved.join('\n') + '\n';
};

exports.normalizeLineEndings = function(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
};

exports.matchesPseudo = function(needle, haystack) {
  return haystack.find(function (element) {
    return needle.indexOf(element) > -1;
  })
}

/**
 * Compares two specificity vectors, returning the winning one.
 *
 * @param {Array} vector a
 * @param {Array} vector b
 * @return {Array}
 * @api public
 */

exports.compareFunc = function(a, b) {
  var min = Math.min(a.length, b.length);
  for (var i = 0; i < min; i++) {
    if (a[i] === b[i]) { continue; }
    if (a[i] > b[i]) { return 1; }
    return -1;
  }

  return a.length - b.length;
};

exports.compare = function(a, b) {
  return exports.compareFunc(a, b) == 1 ? a : b;
};

exports.getDefaultOptions = function(options) {
  var result = Object.assign({
    extraCss: '',
    insertPreservedExtraCss: true,
    applyStyleTags: true,
    removeStyleTags: true,
    preserveMediaQueries: true,
    preserveFontFaces: true,
    preserveKeyFrames: true,
    preservePseudos: true,
    applyWidthAttributes: true,
    applyHeightAttributes: true,
    applyAttributesTableElements: true,
    resolveCSSVariables: true,
    url: ''
  }, options);

  result.webResources = result.webResources || {};

  return result;
};
