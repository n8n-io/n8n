define(['./_tagTester', './_stringTagBug', './_methodFingerprint'], function (_tagTester, _stringTagBug, _methodFingerprint) {

	var isSet = _stringTagBug.isIE11 ? _methodFingerprint.ie11fingerprint(_methodFingerprint.setMethods) : _tagTester('Set');

	return isSet;

});
