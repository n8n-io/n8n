"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.types = exports.initializeType = exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _find2 = _interopRequireDefault(require("lodash/find"));
var _some2 = _interopRequireDefault(require("lodash/some"));
var _index = _interopRequireDefault(require("./index"));
// Avoid recreate existing types
const types = exports.types = {};
const initializeType = typeConfig => {
  if (types[typeConfig]) {
    return types[typeConfig];
  }
  const {
    typeConstructor
  } = (0, _find2.default)(_index.default, type => !!typeConfig.match(type.matcher)) || {};
  if (!typeConstructor) {
    throw new Error(`No type found for ${typeConfig}`);
  }
  types[typeConfig] = typeConstructor(typeConfig);
  return types[typeConfig];
};
exports.initializeType = initializeType;
let Type = exports.default = /*#__PURE__*/function () {
  function Type(value) {
    (0, _classCallCheck2.default)(this, Type);
    this.value = value;
  }
  (0, _createClass2.default)(Type, [{
    key: "isValid",
    value: function isValid() {
      return (0, _some2.default)(this.matchers, matcher => `${this.value}`.match(matcher));
    }
  }, {
    key: "getErrorMessage",
    value: function getErrorMessage() {
      if (this.isValid()) {
        return;
      }
      const errorMessage = this.constructor.errorMessage || `has invalid value: ${this.value} for type ${this.constructor.name} `;
      return errorMessage.replace(/\$value/g, this.value);
    }
  }, {
    key: "getValue",
    value: function getValue() {
      return this.value;
    }
  }], [{
    key: "check",
    value: function check(type) {
      return !!type.match(this.constructor.typeChecker);
    }
  }]);
  return Type;
}();