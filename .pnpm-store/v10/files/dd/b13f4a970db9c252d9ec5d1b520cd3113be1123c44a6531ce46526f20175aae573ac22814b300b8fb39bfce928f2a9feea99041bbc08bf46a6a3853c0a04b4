'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/*
 * Create a custom Error class
 */
var error = function error(name, code) {

  return function (_Error) {
    _inherits(MJMLError, _Error);

    function MJMLError(message) {
      _classCallCheck(this, MJMLError);

      var _this = _possibleConstructorReturn(this, (MJMLError.__proto__ || Object.getPrototypeOf(MJMLError)).call(this, '[MJMLError] ' + name + ': ' + message));

      _this.status = code;
      return _this;
    }

    return MJMLError;
  }(Error);
};

/*
 * Warnings are printed to stderr
 */
/* eslint-disable no-unused-vars */
var warning = function warning(name) {
  return function (message) {
    console.error('[MJMLWarning] ' + name + ': ' + message); // eslint-disable-line no-console
  };
};
/* eslint-enable no-unused-vars */

/*
 * Error while parsing the code with cheerio
 */
var ParseError = exports.ParseError = error('ParseError', 1);

/*
 * Error when encounter an empty MJML Element that should be filled
 */
var EmptyMJMLError = exports.EmptyMJMLError = error('EmptyMJMLError', 2);

/*
 * Triggered when an MJML is anormally null/udefined
 */
var NullElementError = exports.NullElementError = error('EmptyMJMLError', 3);

var MJMLValidationError = function () {
  function MJMLValidationError(errors) {
    _classCallCheck(this, MJMLValidationError);

    this.errors = errors;
  }

  _createClass(MJMLValidationError, [{
    key: 'getMessages',
    value: function getMessages() {
      return this.errors.map(function (error) {
        return error.formattedMessage;
      });
    }
  }, {
    key: 'getErrors',
    value: function getErrors() {
      return this.errors;
    }
  }]);

  return MJMLValidationError;
}();

exports.MJMLValidationError = MJMLValidationError;