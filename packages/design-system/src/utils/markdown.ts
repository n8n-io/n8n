export const escapeMarkdown = (html: string | undefined): string => {
	if (!html) {
		return '';
	}
	const escaped = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

	// unescape greater than quotes at start of line
	const withQuotes = escaped.replace(/^((\s)*(&gt;)+)+\s*/gm, (matches) => {
		return matches.replace(/&gt;/g, '>');
	});

	return withQuotes;
};

/**
 * Replace nth occurrence of a regex match in a string
 * @param markdown string to replace in
 * @param regex regex to match
 * @param replacement string to replace with
 * @param index position of the occurrence to replace
 */
export const replaceNth = (markdown: string, regex: RegExp, replacement: string, index: number) => {
	let occurrence = 0;
	return markdown.replace(regex, (match) => {
		occurrence++;
		if (occurrence === index) {
			return replacement;
		}
		return match;
	});
};
