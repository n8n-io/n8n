self.Flatted = (function (exports) {
  'use strict';

  function _typeof(o) {
    "@babel/helpers - typeof";

    return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
      return typeof o;
    } : function (o) {
      return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
    }, _typeof(o);
  }

  /// <reference types="../types/index.d.ts" />

  // (c) 2020-present Andrea Giammarchi

  var $parse = JSON.parse,
    $stringify = JSON.stringify;
  var keys = Object.keys;
  var Primitive = String; // it could be Number
  var primitive = 'string'; // it could be 'number'

  var ignore = {};
  var object = 'object';
  var noop = function noop(_, value) {
    return value;
  };
  var primitives = function primitives(value) {
    return value instanceof Primitive ? Primitive(value) : value;
  };
  var Primitives = function Primitives(_, value) {
    return _typeof(value) === primitive ? new Primitive(value) : value;
  };
  var _revive = function revive(input, parsed, output, $) {
    var lazy = [];
    for (var ke = keys(output), length = ke.length, y = 0; y < length; y++) {
      var k = ke[y];
      var value = output[k];
      if (value instanceof Primitive) {
        var tmp = input[value];
        if (_typeof(tmp) === object && !parsed.has(tmp)) {
          parsed.add(tmp);
          output[k] = ignore;
          lazy.push({
            k: k,
            a: [input, parsed, tmp, $]
          });
        } else output[k] = $.call(output, k, tmp);
      } else if (output[k] !== ignore) output[k] = $.call(output, k, value);
    }
    for (var _length = lazy.length, i = 0; i < _length; i++) {
      var _lazy$i = lazy[i],
        _k = _lazy$i.k,
        a = _lazy$i.a;
      output[_k] = $.call(output, _k, _revive.apply(null, a));
    }
    return output;
  };
  var set = function set(known, input, value) {
    var index = Primitive(input.push(value) - 1);
    known.set(value, index);
    return index;
  };

  /**
   * Converts a specialized flatted string into a JS value.
   * @param {string} text
   * @param {(this: any, key: string, value: any) => any} [reviver]
   * @returns {any}
   */
  var parse = function parse(text, reviver) {
    var input = $parse(text, Primitives).map(primitives);
    var value = input[0];
    var $ = reviver || noop;
    var tmp = _typeof(value) === object && value ? _revive(input, new Set(), value, $) : value;
    return $.call({
      '': tmp
    }, '', tmp);
  };

  /**
   * Converts a JS value into a specialized flatted string.
   * @param {any} value
   * @param {((this: any, key: string, value: any) => any) | (string | number)[] | null | undefined} [replacer]
   * @param {string | number | undefined} [space]
   * @returns {string}
   */
  var stringify = function stringify(value, replacer, space) {
    var $ = replacer && _typeof(replacer) === object ? function (k, v) {
      return k === '' || -1 < replacer.indexOf(k) ? v : void 0;
    } : replacer || noop;
    var known = new Map();
    var input = [];
    var output = [];
    var i = +set(known, input, $.call({
      '': value
    }, '', value));
    var firstRun = !i;
    while (i < input.length) {
      firstRun = true;
      output[i] = $stringify(input[i++], replace, space);
    }
    return '[' + output.join(',') + ']';
    function replace(key, value) {
      if (firstRun) {
        firstRun = !firstRun;
        return value;
      }
      var after = $.call(this, key, value);
      switch (_typeof(after)) {
        case object:
          if (after === null) return after;
        case primitive:
          return known.get(after) || set(known, input, after);
      }
      return after;
    }
  };

  /**
   * Converts a generic value into a JSON serializable object without losing recursion.
   * @param {any} value
   * @returns {any}
   */
  var toJSON = function toJSON(value) {
    return $parse(stringify(value));
  };

  /**
   * Converts a previously serialized object with recursion into a recursive one.
   * @param {any} value
   * @returns {any}
   */
  var fromJSON = function fromJSON(value) {
    return parse($stringify(value));
  };

  exports.fromJSON = fromJSON;
  exports.parse = parse;
  exports.stringify = stringify;
  exports.toJSON = toJSON;

  return exports;

})({});
