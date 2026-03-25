/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * The `RegExpTree` class provides runtime support for `compat-transpiler`
 * module from `regexp-tree`.
 *
 * E.g. it tracks names of the capturing groups, in order to access the
 * names on the matched result.
 *
 * It's a thin-wrapper on top of original regexp.
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RegExpTree = function () {
  /**
   * Initializes a `RegExpTree` instance.
   *
   * @param RegExp - a regular expression
   *
   * @param Object state:
   *
   *   An extra state which may store any related to transformation
   *   data, for example, names of the groups.
   *
   *   - flags - original flags
   *   - groups - names of the groups, and their indices
   *   - source - original source
   */
  function RegExpTree(re, _ref) {
    var flags = _ref.flags,
        groups = _ref.groups,
        source = _ref.source;

    _classCallCheck(this, RegExpTree);

    this._re = re;
    this._groups = groups;

    // Original props.
    this.flags = flags;
    this.source = source || re.source;
    this.dotAll = flags.includes('s');

    // Inherited directly from `re`.
    this.global = re.global;
    this.ignoreCase = re.ignoreCase;
    this.multiline = re.multiline;
    this.sticky = re.sticky;
    this.unicode = re.unicode;
  }

  /**
   * Facade wrapper for RegExp `test` method.
   */


  _createClass(RegExpTree, [{
    key: 'test',
    value: function test(string) {
      return this._re.test(string);
    }

    /**
     * Facade wrapper for RegExp `compile` method.
     */

  }, {
    key: 'compile',
    value: function compile(string) {
      return this._re.compile(string);
    }

    /**
     * Facade wrapper for RegExp `toString` method.
     */

  }, {
    key: 'toString',
    value: function toString() {
      if (!this._toStringResult) {
        this._toStringResult = '/' + this.source + '/' + this.flags;
      }
      return this._toStringResult;
    }

    /**
     * Facade wrapper for RegExp `exec` method.
     */

  }, {
    key: 'exec',
    value: function exec(string) {
      var result = this._re.exec(string);

      if (!this._groups || !result) {
        return result;
      }

      result.groups = {};

      for (var group in this._groups) {
        var groupNumber = this._groups[group];
        result.groups[group] = result[groupNumber];
      }

      return result;
    }
  }]);

  return RegExpTree;
}();

module.exports = {
  RegExpTree: RegExpTree
};