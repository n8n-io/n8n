const RE_NARGS = /(%|)\{([0-9a-zA-Z_]+)\}/g;
/**
 *  String format template
 *  - Inspired:
 *    https://github.com/ElemeFE/element/blob/dev/src/locale/format.js
 *    https://github.com/Matt-Esch/string-template/index.js
 */
export default function () {
	function template(
		value: string | ((...args: unknown[]) => string),
		...args: Array<string | object>
	) {
		if (typeof value === 'function') {
			return value(args);
		}

		const str = value;
		if (args.length === 1 && typeof args[0] === 'object') {
			args = args[0] as unknown as Array<string | object>;
		}

		if (!args?.hasOwnProperty) {
			args = {} as unknown as Array<string | object>;
		}

		return str.replace(RE_NARGS, (match, _, i, index: number) => {
			let result: string | object | null;

			if (str[index - 1] === '{' && str[index + match.length] === '}') {
				return i;
			} else {
				result = Object.hasOwn(args, i) ? args[i] : null;
				if (result === null || result === undefined) {
					return '';
				}

				return result;
			}
		});
	}

	return template;
}
