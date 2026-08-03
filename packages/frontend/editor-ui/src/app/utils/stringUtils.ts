/**
 * Split given text by the search term
 *
 * @param text Text to split
 * @param search The search term
 * @returns An array containing splitted text, each containing text fragment and the match flag.
 */
export function splitTextBySearch(
	text: string,
	search: string,
): Array<{ isMatched: boolean; content: string }> {
	if (!search) {
		return [{ isMatched: false, content: text }];
	}

	const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	const pattern = new RegExp(`(${escapeRegExp(search)})`, 'i');

	return text
		.split(pattern)
		.map((part) => ({ isMatched: pattern.test(part), content: part }))
		.filter((part) => part.content !== '');
}
