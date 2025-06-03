export const truncate = (text: string, length = 30): string =>
	text.length > length ? text.slice(0, length) + '...' : text;

/**
 * Replace part of given text with ellipsis following the rules below:
 *
 * - Remove chars just before the last word, as long as the last word is under 15 chars
 * - Otherwise preserve the last 5 chars of the name and remove chars before that
 */
export function truncateBeforeLast(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}

	const words = text.split(/\s+/);
	const lastWord = words[words.length - 1];
	const ellipsis = '…';
	const ellipsisLength = ellipsis.length;

	if (lastWord.length < 15) {
		const charsToRemove = text.length - maxLength + ellipsisLength;
		const indexBeforeLastWord = text.lastIndexOf(lastWord);
		const keepLength = indexBeforeLastWord - charsToRemove;

		if (keepLength > 0) {
			return text.slice(0, keepLength) + ellipsis + text.slice(indexBeforeLastWord);
		}
	}

	return text.slice(0, maxLength - 5 - ellipsisLength) + ellipsis + text.slice(-5);
}
