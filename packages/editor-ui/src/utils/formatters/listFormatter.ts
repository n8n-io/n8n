/**
 * Formats a list of items into a string. Each item is formatted using
 * the given function and the are separated by a comma except for the last
 * item which is separated by "and".
 *
 * @example
 * formatList(['a', 'b', 'c'], (x) => x);
 * // => 'a, b and c'
 */
export const formatList = <T>(list: T[], formatFn: (item: T) => string) => {
	if (list.length === 0) {
		return '';
	}
	if (list.length === 1) {
		return formatFn(list[0]);
	}

	const allButLast = list.slice(0, -1);
	const last = list.slice(-1)[0];
	return `${allButLast.map(formatFn).join(', ')} and ${formatFn(last)}`;
};
