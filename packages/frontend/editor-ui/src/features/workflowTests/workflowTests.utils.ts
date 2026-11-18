/** Vitest joins the names of the enclosing `describe` blocks and the test name with this. */
export const FULL_NAME_SEPARATOR = ' > ';

/** A `describe` block or a test, as the file declares it. */
export type TestFileNode =
	| { kind: 'describe'; name: string; fullName: string; children: TestFileNode[] }
	| { kind: 'test'; name: string; fullName: string; code: string };

/**
 * Matches the start of a `describe`, `test` or `it` call with a literal name,
 * with modifiers such as `.skip` or `.only`. It is anchored at the scan position.
 */
const CALL =
	/(describe|suite|test|it)(?:\.(?:skip|only|todo|fails|concurrent|sequential))*\s*\(\s*(['"`])((?:\\.|(?!\2)[^\\])*)\2/y;

const IDENTIFIER_CHAR = /[\w$.]/;

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

/** The index after the bracket that closes the one at `open`, and an optional `;`. */
function callEnd(source: string, open: number): number {
	let depth = 0;
	let index = open;
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
		if (depth === 0) return source[index] === ';' ? index + 1 : index;
	}
	return source.length;
}

/**
 * Reads the `describe` blocks and tests of a test file without running it, so
 * the Tests tab can list tests that have not run yet and group them. Each test
 * has the full name that the runner reports, and its own source. A name with
 * a template expression is skipped: only the runner knows it.
 */
export function parseTestFile(source: string): TestFileNode[] {
	const root: TestFileNode[] = [];
	const open: Array<{ node: Extract<TestFileNode, { kind: 'describe' }>; depth: number }> = [];
	let depth = 0;
	let index = 0;

	while (index < source.length) {
		const skipped = skipLiteral(source, index);
		if (skipped !== index) {
			index = skipped;
			continue;
		}

		CALL.lastIndex = index;
		const match = IDENTIFIER_CHAR.test(source[index - 1] ?? '') ? null : CALL.exec(source);
		if (match) {
			const [text, kind, quote, rawName] = match;
			const parent = open.at(-1)?.node.children ?? root;
			const path = open.map(({ node }) => node.name);
			const name = rawName.replace(/\\(.)/g, '$1');
			const known = !(quote === '`' && /\$\{/.test(rawName));
			const fullName = [...path, name].join(FULL_NAME_SEPARATOR);

			if (kind === 'describe' || kind === 'suite') {
				const node: Extract<TestFileNode, { kind: 'describe' }> = {
					kind: 'describe',
					name,
					fullName,
					children: [],
				};
				if (known) parent.push(node);
				// The call's bracket is open now. The block ends when the depth returns here.
				open.push({ node, depth });
				depth++;
				index += text.length;
				continue;
			}

			const end = callEnd(source, source.indexOf('(', index));
			if (known) parent.push({ kind: 'test', name, fullName, code: source.slice(index, end) });
			index = end;
			continue;
		}

		const char = source[index];
		if (char === '(' || char === '{' || char === '[') depth++;
		if (char === ')' || char === '}' || char === ']') {
			depth--;
			if (open.length > 0 && open[open.length - 1].depth === depth) open.pop();
		}
		index++;
	}
	return root;
}
