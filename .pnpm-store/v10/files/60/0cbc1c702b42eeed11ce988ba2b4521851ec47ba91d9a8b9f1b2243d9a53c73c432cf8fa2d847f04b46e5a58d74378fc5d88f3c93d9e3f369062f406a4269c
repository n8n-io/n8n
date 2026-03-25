'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.initializeType = exports.types = undefined;

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _some = require('lodash/some');

var _some2 = _interopRequireDefault(_some);

var _find = require('lodash/find');

var _find2 = _interopRequireDefault(_find);

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Avoid recreate existing types
var types = exports.types = {};

var initializeType = exports.initializeType = function initializeType(typeConfig) {
  if (types[typeConfig]) {
    return types[typeConfig];
  }

  var _ref = (0, _find2.default)(_index2.default, function (type) {
    return !!typeConfig.match(type.matcher);
  }) || {},
      typeConstructor = _ref.typeConstructor;

  if (!typeConstructor) {
    throw new Error('No type found for ' + typeConfig);
  }

  types[typeConfig] = typeConstructor(typeConfig);

  return types[typeConfig];
};

var Type = function () {
  function Type(value) {
    (0, _classCallCheck3.default)(this, Type);

    this.value = value;
  }

  (0, _createClass3.default)(Type, [{
    key: 'isValid',
    value: function isValid() {
      var _this = this;

      return (0, _some2.default)(this.matchers, function (matcher) {
        return _this.value.match(matcher);
      });
    }
  }, {
    key: 'getErrorMessage',
    value: function getErrorMessage() {
      if (this.isValid()) {
        return;
      }

      var errorMessage = this.constructor.errorMessage || 'has invalid value: ' + this.value + ' for type ' + this.constructor.name + ' ';

      return errorMessage.replace(/\$value/g, this.value);
    }
  }, {
    key: 'getValue',
    value: function getValue() {
      return this.value;
    }
  }], [{
    key: 'check',
    value: function check(type) {
      return !!type.match(this.constructor.typeChecker);
    }
  }]);
  return Type;
}();

exports.default = Type;