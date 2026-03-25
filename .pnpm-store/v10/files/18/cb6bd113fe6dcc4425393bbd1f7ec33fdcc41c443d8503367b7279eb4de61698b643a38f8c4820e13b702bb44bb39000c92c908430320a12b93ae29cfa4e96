'use strict';

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var _require = require('./colorize'),
  Colorizer = _require.Colorizer;
var _require2 = require('./pad-levels'),
  Padder = _require2.Padder;
var _require3 = require('triple-beam'),
  configs = _require3.configs,
  MESSAGE = _require3.MESSAGE;

/**
 * Cli format class that handles initial state for a a separate
 * Colorizer and Padder instance.
 */
var CliFormat = /*#__PURE__*/function () {
  function CliFormat() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _classCallCheck(this, CliFormat);
    if (!opts.levels) {
      opts.levels = configs.cli.levels;
    }
    this.colorizer = new Colorizer(opts);
    this.padder = new Padder(opts);
    this.options = opts;
  }

  /*
   * function transform (info, opts)
   * Attempts to both:
   * 1. Pad the { level }
   * 2. Colorize the { level, message }
   * of the given `logform` info object depending on the `opts`.
   */
  _createClass(CliFormat, [{
    key: "transform",
    value: function transform(info, opts) {
      this.colorizer.transform(this.padder.transform(info, opts), opts);
      info[MESSAGE] = "".concat(info.level, ":").concat(info.message);
      return info;
    }
  }]);
  return CliFormat;
}();
/*
 * function cli (opts)
 * Returns a new instance of the CLI format that turns a log
 * `info` object into the same format previously available
 * in `winston.cli()` in `winston < 3.0.0`.
 */
module.exports = function (opts) {
  return new CliFormat(opts);
};

//
// Attach the CliFormat for registration purposes
//
module.exports.Format = CliFormat;