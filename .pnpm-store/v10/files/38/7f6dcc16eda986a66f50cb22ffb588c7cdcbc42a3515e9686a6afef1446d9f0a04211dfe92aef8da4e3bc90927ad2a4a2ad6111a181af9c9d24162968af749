/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

var compatTranspiler = require('./compat-transpiler');
var generator = require('./generator');
var optimizer = require('./optimizer');
var parser = require('./parser');
var _transform = require('./transform');
var _traverse = require('./traverse');
var fa = require('./interpreter/finite-automaton');

var _require = require('./compat-transpiler/runtime'),
    RegExpTree = _require.RegExpTree;

/**
 * An API object for RegExp processing (parsing/transform/generation).
 */


var regexpTree = {
  /**
   * Parser module exposed.
   */
  parser: parser,

  /**
   * Expose finite-automaton module.
   */
  fa: fa,

  /**
   * `TransformResult` exposed.
   */
  TransformResult: _transform.TransformResult,

  /**
   * Parses a regexp string, producing an AST.
   *
   * @param string regexp
   *
   *   a regular expression in different formats: string, AST, RegExp.
   *
   * @param Object options
   *
   *   parsing options for this parse call. Default are:
   *
   *     - captureLocations: boolean
   *     - any other custom options
   *
   * @return Object AST
   */
  parse: function parse(regexp, options) {
    return parser.parse('' + regexp, options);
  },


  /**
   * Traverses a RegExp AST.
   *
   * @param Object ast
   * @param Object | Array<Object> handlers
   *
   * Each `handler` is an object containing handler function for needed
   * node types. Example:
   *
   *   regexpTree.traverse(ast, {
   *     onChar(node) {
   *       ...
   *     },
   *   });
   *
   * The value for a node type may also be an object with functions pre and post.
   * This enables more context-aware analyses, e.g. measuring star height.
   */
  traverse: function traverse(ast, handlers, options) {
    return _traverse.traverse(ast, handlers, options);
  },


  /**
   * Transforms a regular expression.
   *
   * A regexp can be passed in different formats (string, regexp or AST),
   * applying a set of transformations. It is a convenient wrapper
   * on top of "parse-traverse-generate" tool chain.
   *
   * @param string | AST | RegExp regexp - a regular expression;
   * @param Object | Array<Object> handlers - a list of handlers.
   *
   * @return TransformResult - a transformation result.
   */
  transform: function transform(regexp, handlers) {
    return _transform.transform(regexp, handlers);
  },


  /**
   * Generates a RegExp string from an AST.
   *
   * @param Object ast
   *
   * Invariant:
   *
   *   regexpTree.generate(regexpTree.parse('/[a-z]+/i')); // '/[a-z]+/i'
   */
  generate: function generate(ast) {
    return generator.generate(ast);
  },


  /**
   * Creates a RegExp object from a regexp string.
   *
   * @param string regexp
   */
  toRegExp: function toRegExp(regexp) {
    var compat = this.compatTranspile(regexp);
    return new RegExp(compat.getSource(), compat.getFlags());
  },


  /**
   * Optimizes a regular expression by replacing some
   * sub-expressions with their idiomatic patterns.
   *
   * @param string regexp
   *
   * @return TransformResult object
   */
  optimize: function optimize(regexp, whitelist) {
    var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
        blacklist = _ref.blacklist;

    return optimizer.optimize(regexp, { whitelist: whitelist, blacklist: blacklist });
  },


  /**
   * Translates a regular expression in new syntax or in new format
   * into equivalent expressions in old syntax.
   *
   * @param string regexp
   *
   * @return TransformResult object
   */
  compatTranspile: function compatTranspile(regexp, whitelist) {
    return compatTranspiler.transform(regexp, whitelist);
  },


  /**
   * Executes a regular expression on a string.
   *
   * @param RegExp|string re - a regular expression.
   * @param string string - a testing string.
   */
  exec: function exec(re, string) {
    if (typeof re === 'string') {
      var compat = this.compatTranspile(re);
      var extra = compat.getExtra();

      if (extra.namedCapturingGroups) {
        re = new RegExpTree(compat.toRegExp(), {
          flags: compat.getFlags(),
          source: compat.getSource(),
          groups: extra.namedCapturingGroups
        });
      } else {
        re = compat.toRegExp();
      }
    }

    return re.exec(string);
  }
};

module.exports = regexpTree;