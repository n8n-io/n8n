'use strict';

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var colors = require('@colors/colors/safe');
var _require = require('triple-beam'),
  LEVEL = _require.LEVEL,
  MESSAGE = _require.MESSAGE;

//
// Fix colors not appearing in non-tty environments
//
colors.enabled = true;

/**
 * @property {RegExp} hasSpace
 * Simple regex to check for presence of spaces.
 */
var hasSpace = /\s+/;

/*
 * Colorizer format. Wraps the `level` and/or `message` properties
 * of the `info` objects with ANSI color codes based on a few options.
 */
var Colorizer = /*#__PURE__*/function () {
  function Colorizer() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _classCallCheck(this, Colorizer);
    if (opts.colors) {
      this.addColors(opts.colors);
    }
    this.options = opts;
  }

  /*
   * Adds the colors Object to the set of allColors
   * known by the Colorizer
   *
   * @param {Object} colors Set of color mappings to add.
   */
  _createClass(Colorizer, [{
    key: "addColors",
    value:
    /*
     * Adds the colors Object to the set of allColors
     * known by the Colorizer
     *
     * @param {Object} colors Set of color mappings to add.
     */
    function addColors(clrs) {
      return Colorizer.addColors(clrs);
    }

    /*
     * function colorize (lookup, level, message)
     * Performs multi-step colorization using @colors/colors/safe
     */
  }, {
    key: "colorize",
    value: function colorize(lookup, level, message) {
      if (typeof message === 'undefined') {
        message = level;
      }

      //
      // If the color for the level is just a string
      // then attempt to colorize the message with it.
      //
      if (!Array.isArray(Colorizer.allColors[lookup])) {
        return colors[Colorizer.allColors[lookup]](message);
      }

      //
      // If it is an Array then iterate over that Array, applying
      // the colors function for each item.
      //
      for (var i = 0, len = Colorizer.allColors[lookup].length; i < len; i++) {
        message = colors[Colorizer.allColors[lookup][i]](message);
      }
      return message;
    }

    /*
     * function transform (info, opts)
     * Attempts to colorize the { level, message } of the given
     * `logform` info object.
     */
  }, {
    key: "transform",
    value: function transform(info, opts) {
      if (opts.all && typeof info[MESSAGE] === 'string') {
        info[MESSAGE] = this.colorize(info[LEVEL], info.level, info[MESSAGE]);
      }
      if (opts.level || opts.all || !opts.message) {
        info.level = this.colorize(info[LEVEL], info.level);
      }
      if (opts.all || opts.message) {
        info.message = this.colorize(info[LEVEL], info.level, info.message);
      }
      return info;
    }
  }], [{
    key: "addColors",
    value: function addColors(clrs) {
      var nextColors = Object.keys(clrs).reduce(function (acc, level) {
        acc[level] = hasSpace.test(clrs[level]) ? clrs[level].split(hasSpace) : clrs[level];
        return acc;
      }, {});
      Colorizer.allColors = Object.assign({}, Colorizer.allColors || {}, nextColors);
      return Colorizer.allColors;
    }
  }]);
  return Colorizer;
}();
/*
 * function colorize (info)
 * Returns a new instance of the colorize Format that applies
 * level colors to `info` objects. This was previously exposed
 * as { colorize: true } to transports in `winston < 3.0.0`.
 */
module.exports = function (opts) {
  return new Colorizer(opts);
};

//
// Attach the Colorizer for registration purposes
//
module.exports.Colorizer = module.exports.Format = Colorizer;