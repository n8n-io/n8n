export default function stripIndent(string) {
	const match = string.match(/^[ \t]*(?=\S)/gm);

	if (!match) {
		return string;
	}

	let minIndent = Number.POSITIVE_INFINITY;
	for (const indent of match) {
		minIndent = Math.min(minIndent, indent.length);
	}

	if (minIndent === 0 || minIndent === Number.POSITIVE_INFINITY) {
		return string;
	}

	return string.replace(new RegExp(`^[ \\t]{${minIndent}}`, 'gm'), '');
}

export function dedent(string) {
	// Remove all leading and trailing whitespace-only lines
	const trimmed = string.replace(/^(?:[ \t]*\r?\n)+|(?:\r?\n[ \t]*)+$/g, '');
	return stripIndent(trimmed);
}
