export const escapeMarkdown = (html: string | undefined): string => {
	if (!html) {
		return '';
	}
	const escaped = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");

	const withBreaks = escaped.replaceAll('&lt;br/&gt;', '<br/>');

	// unescape greater than quotes at start of line
	const withQuotes = withBreaks.replace(/^((\s)*(&gt;)+)+\s*/gm, (matches) => {
		return matches.replace(/&gt;/g, '>');
	});

	return withQuotes;
};
