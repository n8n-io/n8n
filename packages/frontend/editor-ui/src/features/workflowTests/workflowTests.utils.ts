/**
 * Matches `test('name'` and `it('name'`, with an optional modifier such as
 * `.skip` or `.only`. A name with a template expression is not matched.
 */
const TEST_CALL =
	/\b(?:test|it)(?:\.(?:skip|only|todo|fails|concurrent))?\(\s*(['"`])((?:\\.|(?!\1).)*?)\1/g;

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
