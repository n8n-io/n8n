/** Vitest joins the names of the enclosing `describe` blocks and the test name with this. */
export const FULL_NAME_SEPARATOR = ' > ';

/** What a test does to one node, read from the source of the test. */
export type TestNodeMark = {
	kind: 'input' | 'mocked' | 'asserted';
	/** The node name. An input mark has none when the test does not name the trigger. */
	node?: string;
	line: number;
	/** The source line, trimmed. */
	text: string;
};

/** A `describe` block or a test, as the file declares it. */
export type TestFileNode =
	| { kind: 'describe'; name: string; fullName: string; children: TestFileNode[] }
	| {
			kind: 'test';
			name: string;
			fullName: string;
			line: number;
			marks: TestNodeMark[];
			/** The number of `nock` calls. A `nock` call mocks a URL, not a node. */
			httpMocks: number;
	  };

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

const NODE_REFERENCE = /\.node\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*\)/g;
const MOCK_CALL_BEFORE = /\bmockNode\s*\(\s*[\w$.]*(?:\([^()]*\))?$/;
const EXECUTE_CALL = /\bexecuteWorkflow\s*\(/;
const INPUT_OPTION = /\binput\b\s*[:,}]/;
const TRIGGER_OPTION = /\btrigger\s*:\s*(?:[\w$.]+\.node\(\s*)?(['"])((?:\\.|(?!\1)[^\\])*)\1/;
const HTTP_MOCK_CALL = /\bnock\s*\(/g;

function unescapeName(rawName: string): string {
	return rawName.replace(/\\(.)/g, '$1');
}

function lineAt(source: string, index: number): number {
	return source.slice(0, index).split('\n').length;
}

/** The source with each comment replaced by spaces, so the positions stay the same. */
function maskComments(source: string): string {
	let masked = '';
	let index = 0;
	while (index < source.length) {
		const end = skipLiteral(source, index);
		if (end === index) {
			masked += source[index++];
			continue;
		}
		const literal = source.slice(index, end);
		masked += source[index] === '/' ? literal.replace(/[^\n]/g, ' ') : literal;
		index = end;
	}
	return masked;
}

/**
 * Reads the nodes that one test mocks and asserts on, and its trigger input.
 * A mock is a `mockNode(x.node('Name'), …)` call before `executeWorkflow`. Each
 * `.node('Name')` after `executeWorkflow` reads the result, so it is an assertion.
 */
function readTestMarks(source: string, start: number, end: number) {
	const code = maskComments(source.slice(start, end));
	const toMark = (kind: TestNodeMark['kind'], offset: number, node?: string): TestNodeMark => {
		const line = lineAt(source, start + offset);
		return { kind, node, line, text: source.split('\n')[line - 1].trim() };
	};

	const marks: TestNodeMark[] = [];
	const execute = EXECUTE_CALL.exec(code);
	const executeStart = execute?.index ?? code.length;
	const executeEnd = execute ? callEnd(code, code.indexOf('(', execute.index)) : code.length;

	const options = code.slice(executeStart, executeEnd);
	const input = INPUT_OPTION.exec(options);
	if (input) {
		const trigger = TRIGGER_OPTION.exec(options);
		const triggerName = trigger ? unescapeName(trigger[2]) : undefined;
		marks.push(toMark('input', executeStart + input.index, triggerName));
	}

	for (const match of code.matchAll(NODE_REFERENCE)) {
		const [, quote, rawName] = match;
		if (quote === '`' && /\$\{/.test(rawName)) continue;
		const isMock = match.index < executeStart && MOCK_CALL_BEFORE.test(code.slice(0, match.index));
		if (isMock) marks.push(toMark('mocked', match.index, unescapeName(rawName)));
		if (match.index >= executeEnd)
			marks.push(toMark('asserted', match.index, unescapeName(rawName)));
	}

	return { marks, httpMocks: [...code.matchAll(HTTP_MOCK_CALL)].length };
}

/**
 * Reads the `describe` blocks and tests of a test file without running it, so
 * the Tests tab can list tests that have not run yet and group them. Each test
 * has the full name that the runner reports, its 1-based line, and its marks. A name with
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
			const name = unescapeName(rawName);
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
			if (known) {
				parent.push({
					kind: 'test',
					name,
					fullName,
					line: lineAt(source, index),
					...readTestMarks(source, index, end),
				});
			}
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
