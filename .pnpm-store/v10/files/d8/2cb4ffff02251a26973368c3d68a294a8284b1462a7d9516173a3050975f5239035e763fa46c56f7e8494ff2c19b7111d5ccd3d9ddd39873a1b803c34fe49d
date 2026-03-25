'use strict';

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var util = require('util');
var _require = require('triple-beam'),
  SPLAT = _require.SPLAT;

/**
 * Captures the number of format (i.e. %s strings) in a given string.
 * Based on `util.format`, see Node.js source:
 * https://github.com/nodejs/node/blob/b1c8f15c5f169e021f7c46eb7b219de95fe97603/lib/util.js#L201-L230
 * @type {RegExp}
 */
var formatRegExp = /%[scdjifoO%]/g;

/**
 * Captures the number of escaped % signs in a format string (i.e. %s strings).
 * @type {RegExp}
 */
var escapedPercent = /%%/g;
var Splatter = /*#__PURE__*/function () {
  function Splatter(opts) {
    _classCallCheck(this, Splatter);
    this.options = opts;
  }

  /**
     * Check to see if tokens <= splat.length, assign { splat, meta } into the
     * `info` accordingly, and write to this instance.
     *
     * @param  {Info} info Logform info message.
     * @param  {String[]} tokens Set of string interpolation tokens.
     * @returns {Info} Modified info message
     * @private
     */
  _createClass(Splatter, [{
    key: "_splat",
    value: function _splat(info, tokens) {
      var msg = info.message;
      var splat = info[SPLAT] || info.splat || [];
      var percents = msg.match(escapedPercent);
      var escapes = percents && percents.length || 0;

      // The expected splat is the number of tokens minus the number of escapes
      // e.g.
      // - { expectedSplat: 3 } '%d %s %j'
      // - { expectedSplat: 5 } '[%s] %d%% %d%% %s %j'
      //
      // Any "meta" will be arugments in addition to the expected splat size
      // regardless of type. e.g.
      //
      // logger.log('info', '%d%% %s %j', 100, 'wow', { such: 'js' }, { thisIsMeta: true });
      // would result in splat of four (4), but only three (3) are expected. Therefore:
      //
      // extraSplat = 3 - 4 = -1
      // metas = [100, 'wow', { such: 'js' }, { thisIsMeta: true }].splice(-1, -1 * -1);
      // splat = [100, 'wow', { such: 'js' }]
      var expectedSplat = tokens.length - escapes;
      var extraSplat = expectedSplat - splat.length;
      var metas = extraSplat < 0 ? splat.splice(extraSplat, -1 * extraSplat) : [];

      // Now that { splat } has been separated from any potential { meta }. we
      // can assign this to the `info` object and write it to our format stream.
      // If the additional metas are **NOT** objects or **LACK** enumerable properties
      // you are going to have a bad time.
      var metalen = metas.length;
      if (metalen) {
        for (var i = 0; i < metalen; i++) {
          Object.assign(info, metas[i]);
        }
      }
      info.message = util.format.apply(util, [msg].concat(_toConsumableArray(splat)));
      return info;
    }

    /**
      * Transforms the `info` message by using `util.format` to complete
      * any `info.message` provided it has string interpolation tokens.
      * If no tokens exist then `info` is immutable.
      *
      * @param  {Info} info Logform info message.
      * @param  {Object} opts Options for this instance.
      * @returns {Info} Modified info message
      */
  }, {
    key: "transform",
    value: function transform(info) {
      var msg = info.message;
      var splat = info[SPLAT] || info.splat;

      // No need to process anything if splat is undefined
      if (!splat || !splat.length) {
        return info;
      }

      // Extract tokens, if none available default to empty array to
      // ensure consistancy in expected results
      var tokens = msg && msg.match && msg.match(formatRegExp);

      // This condition will take care of inputs with info[SPLAT]
      // but no tokens present
      if (!tokens && (splat || splat.length)) {
        var metas = splat.length > 1 ? splat.splice(0) : splat;

        // Now that { splat } has been separated from any potential { meta }. we
        // can assign this to the `info` object and write it to our format stream.
        // If the additional metas are **NOT** objects or **LACK** enumerable properties
        // you are going to have a bad time.
        var metalen = metas.length;
        if (metalen) {
          for (var i = 0; i < metalen; i++) {
            Object.assign(info, metas[i]);
          }
        }
        return info;
      }
      if (tokens) {
        return this._splat(info, tokens);
      }
      return info;
    }
  }]);
  return Splatter;
}();
/*
 * function splat (info)
 * Returns a new instance of the splat format TransformStream
 * which performs string interpolation from `info` objects. This was
 * previously exposed implicitly in `winston < 3.0.0`.
 */
module.exports = function (opts) {
  return new Splatter(opts);
};