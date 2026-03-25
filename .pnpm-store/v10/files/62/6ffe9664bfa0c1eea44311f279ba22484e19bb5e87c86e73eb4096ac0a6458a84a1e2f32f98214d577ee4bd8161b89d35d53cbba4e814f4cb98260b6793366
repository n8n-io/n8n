'use strict';

const detectNewline = string => {
	if (typeof string !== 'string') {
		throw new TypeError('Expected a string');
	}

	const newlines = string.match(/(?:\r?\n)/g) || [];

	if (newlines.length === 0) {
		return;
	}

	const crlf = newlines.filter(newline => newline === '\r\n').length;
	const lf = newlines.length - crlf;

	return crlf > lf ? '\r\n' : '\n';
};

module.exports = detectNewline;
module.exports.graceful = string => (typeof string === 'string' && detectNewline(string)) || '\n';
