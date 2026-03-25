var _tagTester = require('./_tagTester.js');
var _stringTagBug = require('./_stringTagBug.js');
var _methodFingerprint = require('./_methodFingerprint.js');

var isSet = _stringTagBug.isIE11 ? _methodFingerprint.ie11fingerprint(_methodFingerprint.setMethods) : _tagTester('Set');

module.exports = isSet;
