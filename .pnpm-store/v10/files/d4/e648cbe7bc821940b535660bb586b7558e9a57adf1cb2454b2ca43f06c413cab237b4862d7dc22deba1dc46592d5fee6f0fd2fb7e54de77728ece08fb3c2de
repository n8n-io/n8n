define(['./_tagTester', './_stringTagBug', './_methodFingerprint'], function (_tagTester, _stringTagBug, _methodFingerprint) {

	var isMap = _stringTagBug.isIE11 ? _methodFingerprint.ie11fingerprint(_methodFingerprint.mapMethods) : _tagTester('Map');

	return isMap;

});
