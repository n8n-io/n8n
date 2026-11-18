/**
 * Matches `test('name'` and `it('name'`, with an optional modifier such as
 * `.skip` or `.only`. A name with a template expression is not matched.
 */
const TEST_CALL =
	/\b(?:test|it)(?:\.(?:skip|only|todo|fails|concurrent))?\(\s*(['"`])((?:\\.|(?!\1).)*?)\1/g;

/** The index after the string, template or comment that starts at `start`, or `start` if none does. */
function skipLiteral(source: string, start: number): number {
	const char = source[start];
	if (char === '/' && source[start + 1] === '/') {
		const end = source.indexOf('\n', start);
		return end === -1 ? source.length : end;
	}
	if (char === '/' && source[start + 1] === '*') {
		const end = source.indexOf('*/', start + 2);
		return end === -1 ? source.length : end + 2;
	}
	if (char !== "'" && char !== '"' && char !== '`') return start;
	let index = start + 1;
	while (index < source.length && source[index] !== char) {
		index += source[index] === '\\' ? 2 : 1;
	}
	return index + 1;
}

/**
 * Returns the source of one `test(...)` call, from `test` to its closing
 * parenthesis, so a result row can show the code that it ran. Returns
 * `undefined` when the file has no test with this name.
 */
export function extractTestSource(source: string, name: string): string | undefined {
	for (const match of source.matchAll(TEST_CALL)) {
		if (match[2].replace(/\\(.)/g, '$1') !== name) continue;
		const start = match.index;
		let depth = 0;
		let index = source.indexOf('(', start);
		while (index < source.length) {
			const skipped = skipLiteral(source, index);
			if (skipped !== index) {
				index = skipped;
				continue;
			}
			const char = source[index];
			if (char === '(' || char === '{' || char === '[') depth++;
			if (char === ')' || char === '}' || char === ']') depth--;
			index++;
			if (depth === 0) {
				const end = source[index] === ';' ? index + 1 : index;
				return source.slice(start, end);
			}
		}
		return source.slice(start);
	}
	return undefined;
}

/**
 * Reads the test names from a test file without running it, so the Tests tab
 * can list tests that have not run yet. Good enough for the files that the
 * Assistant writes. The names of a run come from the runner.
 */
export function parseTestNames(source: string): string[] {
	const names: string[] = [];
	for (const match of source.matchAll(TEST_CALL)) {
		const [, quote, name] = match;
		if (quote === '`' && /\$\{/.test(name)) continue;
		const unescaped = name.replace(/\\(.)/g, '$1');
		if (!names.includes(unescaped)) names.push(unescaped);
	}
	return names;
}
