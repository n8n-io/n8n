'use strict';

/** @type {import('.').AsyncFunctionConstructor | false} */
var cached;

/** @type {import('.')} */
module.exports = function getAsyncFunction() {
	if (typeof cached === 'undefined') {
		try {
			// eslint-disable-next-line no-new-func
			cached = Function('return async function () {}')().constructor;
		} catch (e) {
			cached = false;
		}
	}
	return cached;
};

