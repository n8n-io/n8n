'use strict';

module.exports = string => {
	if (typeof string !== 'string') {
		throw new TypeError('Expected a string');
	}

	try {
		new URL(string); // eslint-disable-line no-new
		return true;
	} catch {
		return false;
	}
};
