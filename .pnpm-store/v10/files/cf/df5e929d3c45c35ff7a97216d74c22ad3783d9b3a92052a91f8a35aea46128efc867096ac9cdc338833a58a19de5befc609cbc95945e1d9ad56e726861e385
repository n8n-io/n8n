'use strict';

const htmlEscape = string => string
	.replace(/&/g, '&amp;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;');

const htmlUnescape = htmlString => htmlString
	.replace(/&gt;/g, '>')
	.replace(/&lt;/g, '<')
	.replace(/&#0?39;/g, '\'')
	.replace(/&quot;/g, '"')
	.replace(/&amp;/g, '&');

exports.htmlEscape = (strings, ...values) => {
	if (typeof strings === 'string') {
		return htmlEscape(strings);
	}

	let output = strings[0];
	for (const [index, value] of values.entries()) {
		output = output + htmlEscape(String(value)) + strings[index + 1];
	}

	return output;
};

exports.htmlUnescape = (strings, ...values) => {
	if (typeof strings === 'string') {
		return htmlUnescape(strings);
	}

	let output = strings[0];
	for (const [index, value] of values.entries()) {
		output = output + htmlUnescape(String(value)) + strings[index + 1];
	}

	return output;
};
