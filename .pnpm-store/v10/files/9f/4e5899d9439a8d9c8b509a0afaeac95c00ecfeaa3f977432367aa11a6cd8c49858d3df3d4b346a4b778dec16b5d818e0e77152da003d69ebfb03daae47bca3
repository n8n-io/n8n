var DEBUG = false; // `true` to print debugging info.
var TIMER = false; // `true` to time calls to `stringify()` and print the results.

var debug = require('./debug')('stringify');

var _comments;      // Whether comments are allowed in the stringified CSS.
var _compress;      // Whether the stringified CSS should be compressed.
var _indentation;   // Indentation option value.
var _level;         // Current indentation level.
var _n;             // Compression-aware newline character.
var _s;             // Compression-aware space character.

exports = module.exports = stringify;

/**
 * Convert a `stringify`-able AST into a CSS string.
 *
 * @param {Object} `stringify`-able AST
 * @param {Object} [options]
 * @param {Boolean} [options.comments=false] allow comments in the CSS
 * @param {Boolean} [options.compress=false] compress whitespace
 * @param {String} [options.indentation=''] indentation sequence
 * @returns {String} CSS
 */
function stringify(ast, options) {
  var start; // Debug timer start.

  options || (options = {});
  _indentation = options.indentation || '';
  _compress = !!options.compress;
  _comments = !!options.comments;
  _level = 1;

  if (_compress) {
    _n = _s = '';
  } else {
    _n = '\n';
    _s = ' ';
  }

  TIMER && (start = Date.now());

  var css = reduce(ast.stylesheet.rules, stringifyNode).join('\n').trim();

  TIMER && debug('ran in', (Date.now() - start) + 'ms');

  return css;
}

// -- Functions --------------------------------------------------------------

/**
 * Modify the indentation level, or return a compression-aware sequence of
 * spaces equal to the current indentation level.
 *
 * @param {Number} [level=undefined] indentation level modifier
 * @returns {String} sequence of spaces
 */
function indent(level) {
  if (level) {
    _level += level;
    return;
  }

  if (_compress) { return ''; }

  return Array(_level).join(_indentation || '');
}

// -- Stringify Functions ------------------------------------------------------

/**
 * Stringify an @-rule AST node.
 *
 * Use `stringifyAtGroup()` when dealing with @-groups that may contain blocks
 * such as @media.
 *
 * @param {String} type @-rule type. E.g., import, charset
 * @returns {String} Stringified @-rule
 */
function stringifyAtRule(node) {
  return '@' + node.type + ' ' + node.value + ';' + _n;
}

/**
 * Stringify an @-group AST node.
 *
 * Use `stringifyAtRule()` when dealing with @-rules that may not contain blocks
 * such as @import.
 *
 * @param {Object} node @-group AST node
 * @returns {String}
 */
function stringifyAtGroup(node) {
  var label = '';
  var prefix = node.prefix || '';

  if (node.name) {
    label = ' ' + node.name;
  }

  // FIXME: @-rule conditional logic is leaking everywhere.
  var chomp = node.type !== 'page';

  return '@' + prefix + node.type + label + _s + stringifyBlock(node, chomp) + _n;
}

/**
 * Stringify a comment AST node.
 *
 * @param {Object} node comment AST node
 * @returns {String}
 */
function stringifyComment(node) {
  if (!_comments) { return ''; }

  return '/*' + (node.text || '') + '*/' + _n;
}

/**
 * Stringify a rule AST node.
 *
 * @param {Object} node rule AST node
 * @returns {String}
 */
function stringifyRule(node) {
  var label;

  if (node.selectors) {
    label = node.selectors.join(',' + _n);
  } else {
    label = '@' + node.type;
    label += node.name ? ' ' + node.name : '';
  }

  return indent() + label + _s + stringifyBlock(node) + _n;
}


// -- Stringify Helper Functions -----------------------------------------------

/**
 * Reduce an array by applying a function to each item and retaining the truthy
 * results.
 *
 * When `item.type` is `'comment'` `stringifyComment` will be applied instead.
 *
 * @param {Array} items array to reduce
 * @param {Function} fn function to call for each item in the array
 *   @returns {Mixed} Truthy values will be retained, falsy values omitted
 * @returns {Array} retained results
 */
function reduce(items, fn) {
  return items.reduce(function (results, item) {
    var result = (item.type === 'comment') ? stringifyComment(item) : fn(item);
    result && results.push(result);
    return results;
  }, []);
}

/**
 * Stringify an AST node with the assumption that it represents a block of
 * declarations or other @-group contents.
 *
 * @param {Object} node AST node
 * @returns {String}
 */
// FIXME: chomp should not be a magic boolean parameter
function stringifyBlock(node, chomp) {
  var children = node.declarations;
  var fn = stringifyDeclaration;

  if (node.rules) {
    children = node.rules;
    fn = stringifyRule;
  }

  children = stringifyChildren(children, fn);
  children && (children = _n + children + (chomp ? '' : _n));

  return '{' + children + indent() + '}';
}

/**
 * Stringify an array of child AST nodes by calling the given stringify function
 * once for each child, and concatenating the results.
 *
 * @param {Array} children `node.rules` or `node.declarations`
 * @param {Function} fn stringify function
 * @returns {String}
 */
function stringifyChildren(children, fn) {
  if (!children) { return ''; }

  indent(1);
  var results = reduce(children, fn);
  indent(-1);

  if (!results.length) { return ''; }

  return results.join(_n);
}

/**
 * Stringify a declaration AST node.
 *
 * @param {Object} node declaration AST node
 * @returns {String}
 */
function stringifyDeclaration(node) {
  if (node.type === 'property') {
    return stringifyProperty(node);
  }

  DEBUG && debug('stringifyDeclaration: unexpected node:', JSON.stringify(node));
}

/**
 * Stringify an AST node.
 *
 * @param {Object} node AST node
 * @returns {String}
 */
function stringifyNode(node) {
  switch (node.type) {
  // Cases are listed in roughly descending order of probability.
  case 'rule': return stringifyRule(node);

  case 'media'    :
  case 'keyframes': return stringifyAtGroup(node);

  case 'comment': return stringifyComment(node);

  case 'import'   :
  case 'charset'  :
  case 'namespace': return stringifyAtRule(node);

  case 'font-face':
  case 'supports' :
  case 'viewport' :
  case 'document' :
  case 'page'     : return stringifyAtGroup(node);
  }

  DEBUG && debug('stringifyNode: unexpected node: ' + JSON.stringify(node));
}

/**
 * Stringify an AST property node.
 *
 * @param {Object} node AST property node
 * @returns {String}
 */
function stringifyProperty(node) {
  var name = node.name ? node.name + ':' + _s : '';

  return indent() + name + node.value + ';';
}
