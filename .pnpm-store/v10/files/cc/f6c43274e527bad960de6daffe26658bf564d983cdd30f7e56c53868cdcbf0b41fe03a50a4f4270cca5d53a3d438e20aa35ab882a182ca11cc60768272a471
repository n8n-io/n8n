'use strict';
const escapeStringRegexp = require('escape-string-regexp');
const mapping = require('./lib/mappings');

const hasFlags = (regexFlags, replaceFlags) => {
	if (!replaceFlags) {
		return true;
	}

	// Check if every flag in the replace flags is part of the original regex flags
	return replaceFlags.split('').every(flag => regexFlags.includes(flag));
};

module.exports = (regexp, flags) => {
	flags = flags || '';

	if (typeof regexp !== 'string') {
		throw new TypeError(`Expected regexp to be of type \`string\`, got \`${typeof regexp}\``);
	}

	if (typeof flags !== 'string') {
		throw new TypeError(`Expected flags to be of type \`string\`, got \`${typeof flags}\``);
	}

	for (const replace of mapping) {
		const key = replace[0];
		const replacement = replace[1];

		if (hasFlags(flags, replacement.flags)) {
			regexp = regexp.replace(new RegExp(escapeStringRegexp(key), 'g'), replacement.value);
		}
	}

	return regexp;
};
