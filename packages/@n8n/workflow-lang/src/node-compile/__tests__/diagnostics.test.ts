import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { HOST_GLOBALS } from '../../convert/code-native/translate.ts';
import { classify, diagnose, RULES } from '../diagnostics.ts';
import { specialiseNode } from '../specialise.ts';

const here = dirname(fileURLToPath(import.meta.url));
const ENTRY = '/sample/Sample.node.ts';

function lint(body: string, head = '', extra: Record<string, string> = {}) {
	const source = `${head}
export class Sample {
	async execute(this: any) {
		const items = this.getInputData();
${body}
		return [items];
	}
}
`;
	const files: Record<string, string> = { [ENTRY]: source, ...extra };
	const readFile = (path: string) => files[path];
	const result = specialiseNode({
		type: 'n8n-nodes-sample.sample',
		version: 1,
		entry: ENTRY,
		readFile,
		parameters: {},
	});
	const diagnostics = diagnose({
		errors: result.errors,
		origins: result.origins,
		entry: ENTRY,
		readFile,
	});
	return diagnostics.map((d) => ({
		code: d.code,
		file: d.file,
		function: d.function,
		precision: d.precision,
		decided: d.decided,
		remediation: d.remediation,
		text: d.text,
		line: (files[d.file] ?? '').split('\n')[d.line - 1]?.trim(),
		at: (files[d.file] ?? '').split('\n')[d.line - 1]?.slice(d.column - 1),
	}));
}

describe('locations of node compiler diagnostics', () => {
	it('points at `this` that is stored in a name', () => {
		const [d] = lint('\t\tconst self = this;\n\t\titems.push(self.getNode());');
		expect(d).toMatchObject({
			code: 'NC010',
			file: ENTRY,
			function: 'execute',
			precision: 'construct',
			decided: true,
			line: 'const self = this;',
		});
		expect(d.at).toBe('this;');
	});

	it('points at the use of a package without a compiled form', () => {
		const [d] = lint(
			'\t\tconst client = new Client();\n\t\titems.push(client);',
			"import { Client } from 'pg';",
		);
		expect(d).toMatchObject({
			code: 'NC001',
			precision: 'construct',
			decided: true,
			line: 'const client = new Client();',
		});
		expect(d.remediation).toContain('native version');
	});

	it('points at a parameter read with a computed name', () => {
		const [d] = lint(
			'\t\tconst name = items[0].json.name;\n\t\titems.push(this.getNodeParameter(name, 0));',
		);
		expect(d).toMatchObject({ code: 'NC020', precision: 'construct', decided: false });
		expect(d.at).toBe('this.getNodeParameter(name, 0));');
	});

	it('points at a credential that is used as a whole value', () => {
		const found = lint(
			"\t\tconst credentials = await this.getCredentials('acmeApi');\n\t\titems.push({ json: credentials });",
		);
		expect(found.map((d) => d.code)).toEqual(['NC030']);
		expect(found[0].at).toBe('credentials });');
	});

	it('points at the declaration that a closure factory makes, in its own file', () => {
		const [d] = lint(
			"\t\titems.push(await request.call(this, 'GET'));",
			"import { request } from './transport';",
			{
				'/sample/transport.ts': [
					'function makeTransport(options: any) {',
					'\treturn { request: async function (this: any, method: string) { return method + options.base; } };',
					'}',
					'export const {',
					'\trequest,',
					"} = makeTransport({ base: 'x' });",
					'',
				].join('\n'),
			},
		);
		expect(d).toMatchObject({
			code: 'NC015',
			file: '/sample/transport.ts',
			decided: true,
			line: 'request,',
		});
		expect(d.remediation).toContain("'makeTransport'");
	});

	it('points at the `extends` clause of a class', () => {
		const found = lint(
			'\t\tconst client = new Child();\n\t\titems.push(client.other());',
			[
				'class Parent {',
				"\tname() { return 'p'; }",
				'}',
				'class Child extends Parent {',
				"\tother() { return 'c'; }",
				'}',
			].join('\n'),
		);
		const d = found.find((x) => x.code === 'NC040');
		expect(d).toMatchObject({ function: 'Child', precision: 'construct', decided: true });
		expect(d?.at).toBe('extends Parent {');
	});

	it('points at an object that is made outside a `const` declaration', () => {
		const [d] = lint(
			'\t\titems.push(new Box(1).value());',
			[
				'class Box {',
				'\tsize: number;',
				'\tconstructor(size: number) { this.size = size; }',
				'\tvalue() { return this.size; }',
				'}',
			].join('\n'),
		);
		expect(d).toMatchObject({ code: 'NC042', precision: 'construct' });
		expect(d.at).toBe('new Box(1).value());');
	});

	it('points at a context call with a computed target', () => {
		const [d] = lint(
			'\t\tconst handlers: any = { a: handlerA };\n\t\titems.push(await handlers[items[0].json.kind].call(this));',
			'async function handlerA(this: any) { return this.getNode(); }',
		);
		expect(d).toMatchObject({ code: 'NC012', precision: 'construct', decided: true });
		expect(d.at).toBe('handlers[items[0].json.kind].call(this));');
	});

	it('points into the helper file for an error in a linked function', () => {
		const [d] = lint(
			'\t\titems.push(await helper.call(this));',
			"import { helper } from './helpers';",
			{
				'/sample/helpers.ts': [
					'export async function helper(this: any) {',
					'\tconst first = 1;',
					"\treturn this.getWorkflowStaticData('node');",
					'}',
					'',
				].join('\n'),
			},
		);
		expect(d).toMatchObject({
			code: 'NC011',
			file: '/sample/helpers.ts',
			function: 'helper',
			precision: 'construct',
		});
		expect(d.at).toBe("this.getWorkflowStaticData('node');");
	});

	it('names a global and a test of a caught value', () => {
		expect(lint('\t\tsetTimeout(() => {}, 5);')[0]).toMatchObject({
			code: 'NC108',
			line: 'setTimeout(() => {}, 5);',
		});
		const [d] = lint(
			"\t\ttry {\n\t\t\tthrow 'text';\n\t\t} catch (error) {\n\t\t\tif (error instanceof Error) items.pop();\n\t\t}",
		);
		expect(d).toMatchObject({ code: 'NC051', line: 'if (error instanceof Error) items.pop();' });
	});

	it('marks a construct that the compiler did not place in a function as a candidate', () => {
		const [d] = lint('\t\tawait new Promise((resolve) => resolve(1));');
		expect(d).toMatchObject({ code: 'NC103', precision: 'candidate', function: 'execute' });
	});

	it('gives the function when it cannot find the construct, and the file when it has nothing', () => {
		const origins = [{ unit: 'execute', file: ENTRY, declared: 'execute', owner: 'Sample' }];
		const source = 'export class Sample {\n\tasync execute() {\n\t\treturn [];\n\t}\n}\n';
		const [inFunction, inFile] = diagnose({
			errors: ['execute: `this` as a value has no compiled form', 'a new failure'],
			origins,
			entry: ENTRY,
			readFile: () => source,
		});
		expect(inFunction).toMatchObject({ code: 'NC010', line: 2, column: 8, precision: 'function' });
		expect(inFile).toMatchObject({ code: 'NC999', precision: 'function', text: 'a new failure' });
		const [alone] = diagnose({
			errors: ['a new failure'],
			entry: ENTRY,
			readFile: () => undefined,
		});
		expect(alone).toMatchObject({
			code: 'NC999',
			file: ENTRY,
			line: 1,
			column: 1,
			precision: 'file',
		});
	});
});

function samplesOf(e: ts.Expression, constants: Map<string, ts.Expression>): string[] {
	if (ts.isStringLiteralLike(e)) return [e.text];
	if (ts.isTemplateExpression(e)) {
		const literal = e.head.text + e.templateSpans.map((span) => span.literal.text).join('');
		if (!/[A-Za-z]{3}/.test(literal)) return [];
		const fill = (span: ts.TemplateSpan) =>
			(ts.isIdentifier(span.expression) ? constants.get(span.expression.text) : undefined) ??
			span.expression;
		const text =
			e.head.text +
			e.templateSpans
				.map((span) => `${samplesOf(fill(span), constants)[0] ?? 'X'}${span.literal.text}`)
				.join('');
		return text === 'X has no compiled form' ? [] : [text];
	}
	if (ts.isConditionalExpression(e))
		return [...samplesOf(e.whenTrue, constants), ...samplesOf(e.whenFalse, constants)];
	if (ts.isParenthesizedExpression(e)) return samplesOf(e.expression, constants);
	if (ts.isIdentifier(e)) {
		const value = constants.get(e.text);
		return value ? samplesOf(value, constants) : [];
	}
	return [];
}

function parse(file: string) {
	const path = join(here, file);
	const sf = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.ES2022, true);
	const constants = new Map<string, ts.Expression>();
	for (const statement of sf.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		for (const d of statement.declarationList.declarations)
			if (ts.isIdentifier(d.name) && d.initializer) constants.set(d.name.text, d.initializer);
	}
	return { sf, constants };
}

function compilerMessages(): string[] {
	const out: string[] = [];
	const specialise = parse('../specialise.ts');
	const walk = (n: ts.Node) => {
		if (ts.isCallExpression(n)) {
			const callee = n.expression;
			if (
				ts.isPropertyAccessExpression(callee) &&
				callee.expression.kind === ts.SyntaxKind.ThisKeyword &&
				callee.name.text === 'error' &&
				n.arguments.length === 2
			)
				out.push(...samplesOf(n.arguments[1], specialise.constants));
			if (ts.isIdentifier(callee) && callee.text === 'refuse' && n.arguments.length === 1)
				out.push(
					...samplesOf(n.arguments[0], specialise.constants).map(
						(what) => `${what} has no compiled form`,
					),
				);
		}
		ts.forEachChild(n, walk);
	};
	walk(specialise.sf);

	const moment = parse('../moment.ts');
	const reason = (text: string) => /^(a|an|the) /.test(text);
	const walkMoment = (n: ts.Node) => {
		if (
			ts.isCallExpression(n) &&
			ts.isIdentifier(n.expression) &&
			n.expression.text === 'fail' &&
			n.arguments.length === 1
		)
			out.push(
				...samplesOf(n.arguments[0], moment.constants).map(
					(what) => `${what} has no compiled form`,
				),
			);
		if (ts.isReturnStatement(n) && n.expression) {
			const value = n.expression;
			if (ts.isStringLiteralLike(value) || ts.isTemplateExpression(value))
				out.push(
					...samplesOf(value, moment.constants)
						.filter(reason)
						.map((what) => `${what} has no compiled form`),
				);
			if (ts.isObjectLiteralExpression(value)) {
				for (const p of value.properties)
					if (ts.isPropertyAssignment(p) && p.name.getText(moment.sf) === 'error')
						out.push(...samplesOf(p.initializer, moment.constants));
			}
		}
		ts.forEachChild(n, walkMoment);
	};
	walkMoment(moment.sf);
	return out;
}

function translatorFeatures(): string[] {
	const { sf, constants } = parse('../../convert/code-native/translate.ts');
	const out: string[] = Object.values(HOST_GLOBALS);
	const walk = (n: ts.Node) => {
		if (
			ts.isCallExpression(n) &&
			ts.isIdentifier(n.expression) &&
			n.expression.text === 'block' &&
			n.arguments.length === 2
		)
			out.push(...samplesOf(n.arguments[0], constants));
		ts.forEachChild(n, walk);
	};
	walk(sf);
	return [...new Set(out)];
}

describe('the catalogue of node compiler rules', () => {
	const catalogue = readFileSync(join(here, '../../../docs/node-compile-rules.md'), 'utf8');
	const headings = [...catalogue.matchAll(/^## (NC\d{3}) /gm)].map((m) => m[1]);

	it('has one rule for each message that the node compiler can make', () => {
		const messages = compilerMessages();
		expect(messages.length).toBeGreaterThan(80);
		const unknown = messages.filter(
			(message) => classify(`unit: ${message}`).rule.code === 'NC999',
		);
		expect(unknown).toEqual([]);
	});

	it('has one rule for each blocker that the translator can make', () => {
		const features = translatorFeatures();
		expect(features.length).toBeGreaterThan(60);
		const unknown = features.filter(
			(feature) => classify(`code: ${feature}: \`X\` has no native form.`).rule.code === 'NC999',
		);
		expect(unknown).toEqual([]);
	});

	it('gives a compiler check failure and an unknown message their own codes', () => {
		expect(classify('WL020: Regular expressions are not allowed.').rule.code).toBe('NC190');
		expect(classify('something new').rule.code).toBe('NC999');
		expect(classify('execute: something new')).toMatchObject({
			where: 'execute',
			message: 'something new',
		});
	});

	it('has one catalogue entry for each code, in order, and no other entry', () => {
		expect(headings).toEqual(RULES.map((rule) => rule.code));
		expect(new Set(headings).size).toBe(headings.length);
	});

	it('marks the constructs that the project decided not to support', () => {
		for (const rule of RULES) {
			const start = catalogue.indexOf(`## ${rule.code} `);
			const end = catalogue.indexOf('\n## ', start + 1);
			const entry = catalogue.slice(start, end === -1 ? undefined : end);
			expect([rule.code, entry.includes('**Not supported by decision')]).toEqual([
				rule.code,
				rule.decided !== undefined,
			]);
			expect([rule.code, entry.includes('```ts')]).toEqual([rule.code, rule.code !== 'NC999']);
		}
	});

	it('keeps the codes stable', () => {
		expect(RULES.map((rule) => rule.code).join(' ')).toMatchInlineSnapshot(
			`"NC001 NC002 NC003 NC004 NC010 NC011 NC012 NC013 NC014 NC015 NC020 NC021 NC022 NC030 NC031 NC032 NC033 NC034 NC040 NC041 NC042 NC043 NC044 NC045 NC050 NC051 NC052 NC053 NC054 NC100 NC101 NC102 NC103 NC104 NC105 NC106 NC107 NC108 NC190 NC999"`,
		);
	});
});
