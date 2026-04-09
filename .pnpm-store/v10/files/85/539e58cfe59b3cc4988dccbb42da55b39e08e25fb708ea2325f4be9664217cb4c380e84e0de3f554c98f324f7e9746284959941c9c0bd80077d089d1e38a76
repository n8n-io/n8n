const require_rolldown_runtime = require('../_virtual/rolldown_runtime.js');

//#region lib/utils/regexp.js
var require_regexp = /* @__PURE__ */ require_rolldown_runtime.__commonJSMin(((exports, module) => {
	const RE_REGEXP_CHAR = /[\\^$.*+?()[\]{}|]/gu;
	const RE_HAS_REGEXP_CHAR = new RegExp(RE_REGEXP_CHAR.source);
	const RE_REGEXP_STR = /^\/(.+)\/(.*)$/u;
	/**
	* Escapes the `RegExp` special characters "^", "$", "\", ".", "*", "+",
	* "?", "(", ")", "[", "]", "{", "}", and "|" in `string`.
	*
	* @param {string} string The string to escape.
	* @returns {string} Returns the escaped string.
	*/
	function escape(string) {
		return string && RE_HAS_REGEXP_CHAR.test(string) ? string.replaceAll(RE_REGEXP_CHAR, String.raw`\$&`) : string;
	}
	/**
	* Convert a string to the `RegExp`.
	* Normal strings (e.g. `"foo"`) is converted to `/^foo$/` of `RegExp`.
	* Strings like `"/^foo/i"` are converted to `/^foo/i` of `RegExp`.
	*
	* @param {string} string The string to convert.
	* @param {{add?: string, remove?: string}} [flags] The flags to add or remove.
	*   - `add`: Flags to add to the `RegExp` (e.g. `'i'` for case-insensitive).
	*   - `remove`: Flags to remove from the `RegExp` (e.g. `'g'` to remove global matching).
	* @returns {RegExp} Returns the `RegExp`.
	*/
	function toRegExp(string, flags = {}) {
		const parts = RE_REGEXP_STR.exec(string);
		const { add: forceAddFlags = "", remove: forceRemoveFlags = "" } = typeof flags === "object" ? flags : {};
		if (parts) return new RegExp(parts[1], parts[2].replaceAll(new RegExp(`[${forceAddFlags}${forceRemoveFlags}]`, "g"), "") + forceAddFlags);
		return new RegExp(`^${escape(string)}$`, forceAddFlags);
	}
	/**
	* Checks whether given string is regexp string
	* @param {string} string
	* @returns {boolean}
	*/
	function isRegExp(string) {
		return RE_REGEXP_STR.test(string);
	}
	/**
	* Converts an array of strings to a singular function to match any of them.
	* This function converts each string to a `RegExp` and returns a function that checks all of them.
	*
	* @param {string[]} [patterns] The strings or regular expression strings to match.
	* @returns {(...toCheck: string[]) => boolean} Returns a function that checks if any string matches any of the given patterns.
	*/
	function toRegExpGroupMatcher(patterns = []) {
		if (patterns.length === 0) return () => false;
		const regexps = patterns.map((pattern) => toRegExp(pattern, { remove: "g" }));
		if (regexps.length === 1) return (...toCheck) => toCheck.some((str) => regexps[0].test(str));
		return (...toCheck) => regexps.some((regexp) => toCheck.some((str) => regexp.test(str)));
	}
	module.exports = {
		escape,
		toRegExp,
		isRegExp,
		toRegExpGroupMatcher
	};
}));

//#endregion
Object.defineProperty(exports, 'default', {
  enumerable: true,
  get: function () {
    return require_regexp();
  }
});