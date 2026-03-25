var DEBUG = false; // `true` to print debugging info.
var TIMER = false; // `true` to time calls to `parse()` and print the results.

var debug = require('./debug')('parse');
var lex = require('./lexer');

exports = module.exports = parse;

var _comments;   // Whether comments are allowed.
var _depth;      // Current block nesting depth.
var _position;   // Whether to include line/column position.
var _tokens;     // Array of lexical tokens.

/**
 * Convert a CSS string or array of lexical tokens into a `stringify`-able AST.
 *
 * @param {String} css CSS string or array of lexical token
 * @param {Object} [options]
 * @param {Boolean} [options.comments=false] allow comment nodes in the AST
 * @returns {Object} `stringify`-able AST
 */
function parse(css, options) {
  var start; // Debug timer start.

  options || (options = {});
  _comments = !!options.comments;
  _position = !!options.position;

  _depth = 0;

  // Operate on a copy of the given tokens, or the lex()'d CSS string.
  _tokens = Array.isArray(css) ? css.slice() : lex(css);

  var rule;
  var rules = [];
  var token;

  TIMER && (start = Date.now());

  while ((token = next())) {
    rule = parseToken(token);
    rule && rules.push(rule);
  }

  TIMER && debug('ran in', (Date.now() - start) + 'ms');

  return {
    type: "stylesheet",
    stylesheet: {
      rules: rules
    }
  };
}

// -- Functions --------------------------------------------------------------

/**
 * Build an AST node from a lexical token.
 *
 * @param {Object} token lexical token
 * @param {Object} [override] object hash of properties that override those
 *   already in the token, or that will be added to the token.
 * @returns {Object} AST node
 */
function astNode(token, override) {
  override || (override = {});

  var key;
  var keys = ['type', 'name', 'value'];
  var node = {};

  // Avoiding [].forEach for performance reasons.
  for (var i = 0; i < keys.length; ++i) {
    key = keys[i];

    if (token[key]) {
      node[key] = override[key] || token[key];
    }
  }

  keys = Object.keys(override);

  for (i = 0; i < keys.length; ++i) {
    key = keys[i];

    if (!node[key]) {
      node[key] = override[key];
    }
  }

  if (_position) {
    node.position = {
      start: token.start,
      end: token.end
    };
  }

  DEBUG && debug('astNode:', JSON.stringify(node, null, 2));

  return node;
}

/**
 * Remove a lexical token from the stack and return the removed token.
 *
 * @returns {Object} lexical token
 */
function next() {
  var token = _tokens.shift();
  DEBUG && debug('next:', JSON.stringify(token, null, 2));
  return token;
}

// -- Parse* Functions ---------------------------------------------------------

/**
 * Convert an @-group lexical token to an AST node.
 *
 * @param {Object} token @-group lexical token
 * @returns {Object} @-group AST node
 */
function parseAtGroup(token) {
  _depth = _depth + 1;

  // As the @-group token is assembled, relevant token values are captured here
  // temporarily. They will later be used as `tokenize()` overrides.
  var overrides = {};

  switch (token.type) {
  case 'font-face':
  case 'viewport' :
    overrides.declarations = parseDeclarations();
    break;

  case 'page':
    overrides.prefix = token.prefix;
    overrides.declarations = parseDeclarations();
    break;

  default:
    overrides.prefix = token.prefix;
    overrides.rules = parseRules();
  }

  return astNode(token, overrides);
}

/**
 * Convert an @import lexical token to an AST node.
 *
 * @param {Object} token @import lexical token
 * @returns {Object} @import AST node
 */
function parseAtImport(token) {
  return astNode(token);
}

/**
 * Convert an @charset token to an AST node.
 *
 * @param {Object} token @charset lexical token
 * @returns {Object} @charset node
 */
function parseCharset(token) {
  return astNode(token);
}

/**
 * Convert a comment token to an AST Node.
 *
 * @param {Object} token comment lexical token
 * @returns {Object} comment node
 */
function parseComment(token) {
  return astNode(token, {text: token.text});
}

function parseNamespace(token) {
  return astNode(token);
}

/**
 * Convert a property lexical token to a property AST node.
 *
 * @returns {Object} property node
 */
function parseProperty(token) {
  return astNode(token);
}

/**
 * Convert a selector lexical token to a selector AST node.
 *
 * @param {Object} token selector lexical token
 * @returns {Object} selector node
 */
function parseSelector(token) {
  function trim(str) {
    return str.trim();
  }

  return astNode(token, {
    type: 'rule',
    selectors: token.text.split(',').map(trim),
    declarations: parseDeclarations(token)
  });
}

/**
 * Convert a lexical token to an AST node.
 *
 * @returns {Object|undefined} AST node
 */
function parseToken(token) {
  switch (token.type) {
  // Cases are listed in roughly descending order of probability.
  case 'property': return parseProperty(token);

  case 'selector': return parseSelector(token);

  case 'at-group-end': _depth = _depth - 1; return;

  case 'media'     :
  case 'keyframes' :return parseAtGroup(token);

  case 'comment': if (_comments) { return parseComment(token); } break;

  case 'charset': return parseCharset(token);
  case 'import': return parseAtImport(token);

  case 'namespace': return parseNamespace(token);

  case 'font-face':
  case 'supports' :
  case 'viewport' :
  case 'document' :
  case 'page'     : return parseAtGroup(token);
  }

  DEBUG && debug('parseToken: unexpected token:', JSON.stringify(token));
}

// -- Parse Helper Functions ---------------------------------------------------

/**
 * Iteratively parses lexical tokens from the stack into AST nodes until a
 * conditional function returns `false`, at which point iteration terminates
 * and any AST nodes collected are returned.
 *
 * @param {Function} conditionFn
 *   @param {Object} token the lexical token being parsed
 *   @returns {Boolean} `true` if the token should be parsed, `false` otherwise
 * @return {Array} AST nodes
 */
function parseTokensWhile(conditionFn) {
  var node;
  var nodes = [];
  var token;

  while ((token = next()) && (conditionFn && conditionFn(token))) {
    node = parseToken(token);
    node && nodes.push(node);
  }

  // Place an unused non-`end` lexical token back onto the stack.
  if (token && token.type !== 'end') {
    _tokens.unshift(token);
  }

  return nodes;
}

/**
 * Convert a series of tokens into a sequence of declaration AST nodes.
 *
 * @returns {Array} declaration nodes
 */
function parseDeclarations() {
  return parseTokensWhile(function (token) {
    return (token.type === 'property' || token.type === 'comment');
  });
}

/**
 * Convert a series of tokens into a sequence of rule nodes.
 *
 * @returns {Array} rule nodes
 */
function parseRules() {
  return parseTokensWhile(function () { return _depth; });
}
