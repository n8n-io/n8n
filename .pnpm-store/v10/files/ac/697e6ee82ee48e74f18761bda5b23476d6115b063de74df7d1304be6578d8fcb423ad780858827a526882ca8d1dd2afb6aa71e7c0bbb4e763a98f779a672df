/**
 * @otplib/plugin-thirty-two
 *
 * @author Gerald Yeo <contact@fusedthought.com>
 * @version: 12.0.1
 * @license: MIT
 **/
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var thirtyTwo = _interopDefault(require('thirty-two'));

const keyDecoder = (encodedSecret, encoding) => {
  return thirtyTwo.decode(encodedSecret).toString(encoding);
};
const keyEncoder = (secret, encoding) => {
  return thirtyTwo.encode(Buffer.from(secret, encoding).toString('ascii')).toString().replace(/=/g, '');
};

exports.keyDecoder = keyDecoder;
exports.keyEncoder = keyEncoder;
