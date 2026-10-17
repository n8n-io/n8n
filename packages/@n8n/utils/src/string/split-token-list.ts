/**
 * Splits a delimited list of tokens, such as the `allowed-tools` value of a
 * SKILL.md file. Commas separate tokens when the text has any; otherwise
 * whitespace does. Whitespace inside parentheses never splits, so
 * `Bash(git diff:*)` stays one token. Empty tokens are dropped.
 *
 * @example splitTokenList('Bash(git:*), Read, Grep') // ['Bash(git:*)', 'Read', 'Grep']
 * @example splitTokenList('Bash(git diff:*) Read')  // ['Bash(git diff:*)', 'Read']
 */
export function splitTokenList(value: string): string[] {
	const splitOnComma = value.includes(',');
	const tokens: string[] = [];
	let current = '';
	let depth = 0;

	for (const char of value) {
		if (char === '(') depth++;
		else if (char === ')' && depth > 0) depth--;

		const isDelimiter = splitOnComma ? char === ',' : /\s/.test(char) && depth === 0;
		if (isDelimiter) {
			if (current.trim()) tokens.push(current.trim());
			current = '';
			continue;
		}
		current += char;
	}
	if (current.trim()) tokens.push(current.trim());
	return tokens;
}
