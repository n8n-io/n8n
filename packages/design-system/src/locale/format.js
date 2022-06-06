const hasOwnProperty = Object.prototype.hasOwnProperty;

export function hasOwn(obj, key) {
	return hasOwnProperty.call(obj, key);
};


const RE_NARGS = /(%|)\{([0-9a-zA-Z_]+)\}/g;
/**
 *  String format template
 *  - Inspired:
 *    https://github.com/ElemeFE/element/blob/dev/src/locale/format.js
 *    https://github.com/Matt-Esch/string-template/index.js
 */
export default function(Vue) {

	/**
   * template
   *
   * @param {String | Function} string
   * @param {Array} ...args
   * @return {String}
   */

	function template(value, ...args) {
		if (typeof value === 'function') {
			return value(args);
		}
		const string = value;
		if (args.length === 1 && typeof args[0] === 'object') {
			args = args[0];
		}

		if (!args || !args.hasOwnProperty) {
			args = {};
		}

		return string.replace(RE_NARGS, (match, prefix, i, index) => {
			let result;

			if (string[index - 1] === '{' &&
        string[index + match.length] === '}') {
				return i;
			} else {
				result = hasOwn(args, i) ? args[i] : null;
				if (result === null || result === undefined) {
					return '';
				}

				return result;
			}
		});
	}

	return template;
}
