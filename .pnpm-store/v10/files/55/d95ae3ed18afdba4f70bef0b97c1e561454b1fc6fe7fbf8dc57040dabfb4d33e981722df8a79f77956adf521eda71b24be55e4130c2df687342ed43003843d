'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = traverseMJML;

var _flattenDeep = require('lodash/flattenDeep');

var _flattenDeep2 = _interopRequireDefault(_flattenDeep);

var _head = require('lodash/head');

var _head2 = _interopRequireDefault(_head);

var _map = require('lodash/map');

var _map2 = _interopRequireDefault(_map);

var _noop = require('lodash/noop');

var _noop2 = _interopRequireDefault(_noop);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function traverseMJML(mjml) {
  var predicate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _noop2.default;

  var traverse = function traverse(mjml) {
    return (0, _map2.default)(mjml.children, function (child) {
      if (predicate(child)) {
        return child;
      }

      return traverse(child);
    });
  };

  return (0, _head2.default)((0, _flattenDeep2.default)(traverse(mjml)));
}
module.exports = exports['default'];