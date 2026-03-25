/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const PATH_QUERY_FRAGMENT_REGEXP =
	/^(#?(?:\0.|[^?#\0])*)(\?(?:\0.|[^#\0])*)?(#.*)?$/;
const ZERO_ESCAPE_REGEXP = /\0(.)/g;

/**
 * @param {string} identifier identifier
 * @returns {[string, string, string]|null} parsed identifier
 */
function parseIdentifier(identifier) {
	if (!identifier) {
		return null;
	}

	const firstEscape = identifier.indexOf("\0");
	if (firstEscape < 0) {
		// Fast path for inputs that don't use \0 escaping.
		const queryStart = identifier.indexOf("?");
		// Start at index 1 to ignore a possible leading hash.
		const fragmentStart = identifier.indexOf("#", 1);

		if (fragmentStart < 0) {
			if (queryStart < 0) {
				// No fragment, no query
				return [identifier, "", ""];
			}
			// Query, no fragment
			return [
				identifier.slice(0, queryStart),
				identifier.slice(queryStart),
				"",
			];
		}

		if (queryStart < 0 || fragmentStart < queryStart) {
			// Fragment, no query
			return [
				identifier.slice(0, fragmentStart),
				"",
				identifier.slice(fragmentStart),
			];
		}

		// Query and fragment
		return [
			identifier.slice(0, queryStart),
			identifier.slice(queryStart, fragmentStart),
			identifier.slice(fragmentStart),
		];
	}

	const match = PATH_QUERY_FRAGMENT_REGEXP.exec(identifier);

	if (!match) return null;

	return [
		match[1].replace(ZERO_ESCAPE_REGEXP, "$1"),
		match[2] ? match[2].replace(ZERO_ESCAPE_REGEXP, "$1") : "",
		match[3] || "",
	];
}

module.exports.parseIdentifier = parseIdentifier;
