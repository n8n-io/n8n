import jsesc from 'jsesc';

/**
Escape string and wrap the result in quotes.

@param {string} string - The string to be quoted.
@param {string} [quote] - The quote character.
@returns {string} - The quoted and escaped string.
*/
export default function escapeString(string, quote = '\'') {
	/* c8 ignore start */
	if (typeof string !== 'string') {
		throw new TypeError('Unexpected string.');
	}
	/* c8 ignore end */

	return jsesc(string, {
		quotes: quote === '"' ? 'double' : 'single',
		wrap: true,
		es6: true,
		minimal: true,
		lowercaseHex: false,
	});
}
