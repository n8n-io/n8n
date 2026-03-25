define(['./_createSizePropertyCheck', './_getLength'], function (_createSizePropertyCheck, _getLength) {

	// Internal helper for collection methods to determine whether a collection
	// should be iterated as an array or as an object.
	// Related: https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
	// Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
	var isArrayLike = _createSizePropertyCheck(_getLength);

	return isArrayLike;

});
