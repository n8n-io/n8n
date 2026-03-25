define(['./_tagTester', './_stringTagBug', './_methodFingerprint'], function (_tagTester, _stringTagBug, _methodFingerprint) {

	var isWeakMap = _stringTagBug.isIE11 ? _methodFingerprint.ie11fingerprint(_methodFingerprint.weakMapMethods) : _tagTester('WeakMap');

	return isWeakMap;

});
