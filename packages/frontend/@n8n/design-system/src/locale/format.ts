const RE_NARGS = /(%|)\{([0-9a-zA-Z_]+)\}/g;
/**
 *  String format template
 *  - Inspired:
 *    https://github.com/ElemeFE/element/blob/dev/src/locale/format.js
 *    https://github.com/Matt-Esch/string-template/index.js
 */
export default function () {
	const isReplacementGroup = (target: object, key: string): target is Record<string, unknown> =>
		key in target;

	function template(
		value: string | ((...args: unknown[]) => string),
		...args: Array<string | object>
	) {
		if (typeof value === 'function') {
			return value(args);
		}

		const str = value;
		let replacements: object = args;
		if (args.length === 1 && typeof args[0] === 'object') {
			replacements = args[0];
		}

		if (!replacements?.hasOwnProperty) {
			replacements = {};
		}

		return str.replace(RE_NARGS, (match, _, group: string, index: number): string => {
			let result: string | null;

			if (str[index - 1] === '{' && str[index + match.length] === '}') {
				return `${group}`;
			} else {
				result = isReplacementGroup(replacements, group) ? `${replacements[group]}` : null;

				if (result === null || result === undefined) {
					return '';
				}

				return result;
			}
		});
	}

	return template;
}
