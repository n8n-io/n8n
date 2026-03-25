/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var generator = require('../generator');
var parser = require('../parser');
var traverse = require('../traverse');

/**
 * Transform result.
 */

var TransformResult = function () {
  /**
   * Initializes a transform result for an AST.
   *
   * @param Object ast - an AST node
   * @param mixed extra - any extra data a transform may return
   */
  function TransformResult(ast) {
    var extra = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    _classCallCheck(this, TransformResult);

    this._ast = ast;
    this._source = null;
    this._string = null;
    this._regexp = null;
    this._extra = extra;
  }

  _createClass(TransformResult, [{
    key: 'getAST',
    value: function getAST() {
      return this._ast;
    }
  }, {
    key: 'setExtra',
    value: function setExtra(extra) {
      this._extra = extra;
    }
  }, {
    key: 'getExtra',
    value: function getExtra() {
      return this._extra;
    }
  }, {
    key: 'toRegExp',
    value: function toRegExp() {
      if (!this._regexp) {
        this._regexp = new RegExp(this.getSource(), this._ast.flags);
      }
      return this._regexp;
    }
  }, {
    key: 'getSource',
    value: function getSource() {
      if (!this._source) {
        this._source = generator.generate(this._ast.body);
      }
      return this._source;
    }
  }, {
    key: 'getFlags',
    value: function getFlags() {
      return this._ast.flags;
    }
  }, {
    key: 'toString',
    value: function toString() {
      if (!this._string) {
        this._string = generator.generate(this._ast);
      }
      return this._string;
    }
  }]);

  return TransformResult;
}();

module.exports = {
  /**
   * Expose `TransformResult`.
   */
  TransformResult: TransformResult,

  /**
   * Transforms a regular expression applying a set of
   * transformation handlers.
   *
   * @param string | AST | RegExp:
   *
   *   a regular expression in different representations: a string,
   *   a RegExp object, or an AST.
   *
   * @param Object | Array<Object>:
   *
   *   a handler (or a list of handlers) from `traverse` API.
   *
   * @return TransformResult instance.
   *
   * Example:
   *
   *   transform(/[a-z]/i, {
   *     onChar(path) {
   *       const {node} = path;
   *
   *       if (...) {
   *         path.remove();
   *       }
   *     }
   *   });
   */
  transform: function transform(regexp, handlers) {
    var ast = regexp;

    if (regexp instanceof RegExp) {
      regexp = '' + regexp;
    }

    if (typeof regexp === 'string') {
      ast = parser.parse(regexp, {
        captureLocations: true
      });
    }

    traverse.traverse(ast, handlers);

    return new TransformResult(ast);
  }
};