'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _isBrowser = require('./isBrowser');

var _isBrowser2 = _interopRequireDefault(_isBrowser);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CDATARegexp = function CDATARegexp() {
  return (0, _isBrowser2.default)() ? /<!--\[CDATA\[([^]*?)\]\]-->/gm : /<!\[CDATA\[([^]*?)\]\]>/gm;
};

exports.default = function (str) {
  return str.replace(CDATARegexp(), '$1');
};