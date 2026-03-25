/**
 * @otplib/preset-default
 *
 * @author Gerald Yeo <contact@fusedthought.com>
 * @version: 12.0.1
 * @license: MIT
 **/
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var pluginCrypto = require('@otplib/plugin-crypto');
var pluginThirtyTwo = require('@otplib/plugin-thirty-two');
var core = require('@otplib/core');

const hotp = new core.HOTP({
  createDigest: pluginCrypto.createDigest
});
const totp = new core.TOTP({
  createDigest: pluginCrypto.createDigest
});
const authenticator = new core.Authenticator({
  createDigest: pluginCrypto.createDigest,
  createRandomBytes: pluginCrypto.createRandomBytes,
  keyDecoder: pluginThirtyTwo.keyDecoder,
  keyEncoder: pluginThirtyTwo.keyEncoder
});

exports.authenticator = authenticator;
exports.hotp = hotp;
exports.totp = totp;
