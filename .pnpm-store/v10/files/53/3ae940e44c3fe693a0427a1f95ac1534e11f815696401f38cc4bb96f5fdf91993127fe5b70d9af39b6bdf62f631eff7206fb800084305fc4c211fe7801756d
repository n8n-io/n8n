'use strict';

/** @type {GeneratorFunctionConstructor | false} */
var cached;

/** @type {import('./index.js')} */
module.exports = function getGeneratorFunction() {
	if (typeof cached === 'undefined') {
		try {
			// eslint-disable-next-line no-new-func
			cached = Function('return function* () {}')().constructor;
		} catch (e) {
			cached = false;
		}
	}
	return cached;
};

