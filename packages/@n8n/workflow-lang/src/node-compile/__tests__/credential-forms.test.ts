import ts from 'typescript';

import { fallbackResult, truthOfVariableIsFixed, withValueTests } from '../credential-forms.ts';

const isMarker = (e: ts.Node): boolean =>
	ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === '__CREDFIELD';

function parse(source: string): ts.SourceFile {
	return ts.createSourceFile('a.ts', source, ts.ScriptTarget.ES2022, true);
}

function print(node: ts.Node): string {
	if (!ts.isSourceFile(node)) throw new Error('The result is not a source file.');
	return ts.createPrinter().printFile(node).replace(/\s+/g, ' ').trim();
}

function find(root: ts.Node, test: (n: ts.Node) => boolean): ts.Node {
	let found: ts.Node | undefined;
	const walk = (n: ts.Node) => {
		if (!found && test(n)) found = n;
		ts.forEachChild(n, walk);
	};
	walk(root);
	if (!found) throw new Error('The node is not there.');
	return found;
}

function functions(sf: ts.SourceFile): (name: string) => ts.Node | undefined {
	return (name) => sf.statements.find((s) => ts.isFunctionDeclaration(s) && s.name?.text === name);
}

function useIn(sf: ts.SourceFile, unit: string, name: string): { use: ts.Identifier; fn: ts.Node } {
	const fn = functions(sf)(unit);
	if (!fn) throw new Error('The function is not there.');
	const use = find(
		fn,
		(n) => ts.isIdentifier(n) && n.text === name && !ts.isVariableDeclaration(n.parent),
	);
	if (!ts.isIdentifier(use)) throw new Error('The use is not a name.');
	return { use, fn };
}

function fixed(source: string, unit = 'main', name = 'v'): boolean {
	const sf = parse(source);
	const { use, fn } = useIn(sf, unit, name);
	return truthOfVariableIsFixed(use, fn, functions(sf), '__CREDFLAG');
}

describe('node compiler: a test of each value of an object of credential fields', () => {
	it('gives one test for each field when the object is the statement before', () => {
		const out = print(
			withValueTests(
				parse(
					'function a() { const h = { x: __CREDFIELD("a"), y: __CREDFIELD("b") }; return Object.values(h).every(Boolean) ? h : undefined; }',
				),
				isMarker,
			),
		);
		expect(out).toContain('return (!!__CREDFIELD("a") && !!__CREDFIELD("b")) ? h : undefined;');
	});

	it('gives one test for each field of an object in place', () => {
		const out = print(
			withValueTests(
				parse('const ok = Object.values({ x: __CREDFIELD("a"), y: "t" }).every(Boolean);'),
				isMarker,
			),
		);
		expect(out).toContain('const ok = (!!__CREDFIELD("a") && !!"t");');
	});

	it.each([
		[
			'a statement is between the object and the test',
			'function a() { const h = { x: __CREDFIELD("a") }; h.x = 1; return Object.values(h).every(Boolean); }',
		],
		[
			'the object is not constant',
			'function a() { let h = { x: __CREDFIELD("a") }; return Object.values(h).every(Boolean); }',
		],
		[
			'a value is not a field or a literal',
			'function a(q) { const h = { x: __CREDFIELD("a"), y: q }; return Object.values(h).every(Boolean); }',
		],
		[
			'the object has a spread',
			'function a(q) { const h = { x: __CREDFIELD("a"), ...q }; return Object.values(h).every(Boolean); }',
		],
		[
			'the test is in a loop',
			'function a() { const h = { x: __CREDFIELD("a") }; while (Object.values(h).every(Boolean)) { h.x = 0; } }',
		],
		[
			'the test is not Boolean',
			'function a() { const h = { x: __CREDFIELD("a") }; return Object.values(h).every(String); }',
		],
		[
			'no value is a credential field',
			'function a() { const h = { x: "a" }; return Object.values(h).every(Boolean); }',
		],
	])('keeps the code when %s', (_, source) => {
		const sf = parse(source);
		expect(print(withValueTests(sf, isMarker))).toBe(print(sf));
	});
});

describe('node compiler: a variable with a truth value that no credential text changes', () => {
	it('takes an object or nothing behind a credential flag, through a call', () => {
		expect(
			fixed(
				'function get() { const h = { a: __CREDFIELD("a") }; return __CREDFLAG("f1") ? h : undefined; } function main() { const v = get(); if (v) { use(v); } }',
			),
		).toBe(true);
	});

	it.each([
		['a negation', 'function main() { const v = __CREDFLAG("f") ? [] : null; return !v; }'],
		[
			'the left side of a logical operator',
			'function main() { const v = { a: 1 }; return v && 1; }',
		],
		['a flag', 'function main() { const v = __CREDFLAG("f"); return v ? 1 : 2; }'],
		[
			'an awaited call of an async function',
			'async function get() { return {}; } async function main() { const v = await get(); if (v) return 1; }',
		],
	])('takes %s', (_, source) => {
		expect(fixed(source)).toBe(true);
	});

	it.each([
		['a credential field', 'function main() { const v = __CREDFIELD("a"); if (v) return 1; }'],
		[
			'text with a credential field',
			'function main() { const v = `a${__CREDFIELD("a")}`; if (v) return 1; }',
		],
		['a parameter', 'function main(v) { if (v) return 1; }'],
		[
			'one value of two that is text',
			'function main() { let v = {}; v = __CREDFIELD("a"); if (v) return 1; }',
		],
		[
			'a call that can return a field',
			'function get(x) { if (x) return __CREDFIELD("a"); return {}; } function main() { const v = get(1); if (v) return 1; }',
		],
		['a comparison', 'function main() { const v = {}; return v === 1; }'],
		['a use as a value', 'function main() { const v = {}; return [v]; }'],
		[
			'a call of an async function with no await',
			'async function get() { return {}; } function main() { const v = get(); if (v) return 1; }',
		],
		['a loop variable', 'function main(xs) { for (const v of xs) { if (v) return 1; } }'],
		['a compound assignment', 'function main() { let v = {}; v += 1; if (v) return 1; }'],
	])('refuses %s', (_, source) => {
		expect(fixed(source)).toBe(false);
	});
});

describe('node compiler: a credential value as the fallback of a logical operator', () => {
	const subjectOf = (source: string) => {
		const sf = parse(source);
		const use = find(sf, (n) => ts.isIdentifier(n) && n.text === 'v');
		const { subject, parent } = fallbackResult(use);
		return { subject: subject.getText(), parent: ts.SyntaxKind[parent.kind] };
	};

	it('gives the whole operation as the value that the code uses', () => {
		expect(subjectOf('const o = { uri: uri || v };')).toEqual({
			subject: 'uri || v',
			parent: 'PropertyAssignment',
		});
		expect(subjectOf('if ((a ?? (b && v))) {}')).toEqual({
			subject: '(a ?? (b && v))',
			parent: 'IfStatement',
		});
	});

	it('keeps the value when it is the left side or has no logical operator', () => {
		expect(subjectOf('const o = v || uri;').subject).toBe('v');
		expect(subjectOf('const o = (v) === 1;').subject).toBe('v');
	});
});
