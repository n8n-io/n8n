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
