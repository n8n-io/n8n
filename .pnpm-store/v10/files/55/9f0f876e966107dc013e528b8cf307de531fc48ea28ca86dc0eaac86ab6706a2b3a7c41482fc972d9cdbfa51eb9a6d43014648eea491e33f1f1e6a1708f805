'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.merge = exports.defaultUnit = exports.widthParser = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _mergeWith = require('lodash/mergeWith');

var _mergeWith2 = _interopRequireDefault(_mergeWith);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var unitRegex = /[\d\.,]*(\D*)$/;

var widthParser = exports.widthParser = function widthParser(width) {
  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { parseFloatToInt: true };

  var widthUnit = unitRegex.exec(width.toString())[1];
  var unitParsers = { default: parseInt, px: parseInt, '%': opts.parseFloatToInt ? parseInt : parseFloat };
  var widthParser = unitParsers[widthUnit] || unitParsers['default'];

  return { unit: widthUnit || 'px', width: widthParser(width) };
};

var defaultUnit = exports.defaultUnit = function defaultUnit(units) {
  var defaultUnit = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'px';

  if (units === undefined || units === '' || units === null) {
    return undefined;
  }

  return units.toString().split(' ').map(function (unit) {
    var parsedUnit = unitRegex.exec(unit.toString())[1];
    return parsedUnit ? unit : unit.toString() + defaultUnit;
  }).join(' ');
};

// lodash/merge merges `null` values, use mergeWith with a custom strategy to avoid this behaviour
var merge = exports.merge = function merge() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return _mergeWith2.default.apply(undefined, args.concat([function (prev, next) {
    if (next == undefined) {
      return prev;
    }

    if (prev == undefined) {
      return next;
    }

    if ((typeof prev === 'undefined' ? 'undefined' : _typeof(prev)) == 'object' && (typeof next === 'undefined' ? 'undefined' : _typeof(next)) == 'object') {
      return merge({}, prev, next);
    }

    return next;
  }]));
};