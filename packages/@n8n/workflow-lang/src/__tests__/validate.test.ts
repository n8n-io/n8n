import { compile } from '../compiler/index.ts';

const wrap = (body: string, top = '') => `import { webhook, workflow } from '@n8n/workflow-lang';
${top}
export default workflow({
	triggers: [webhook<{ x: number; items: number[] }>({ path: 'p' })],
	async run(ctx, trigger) {
${body}
	},
});
`;

function codes(source: string): string[] {
	return compile(source).diagnostics.map((d) => d.code);
}

describe('subset validation', () => {
	it.each([
		['WL001', 'class A {}\nreturn 1;'],
		['WL001', 'const m = new Map();\nreturn m;'],
		['WL001', 'const f = function () { return this; };\nreturn f;'],
		['WL002', 'var a = 1;\nreturn a;'],
		['WL004', 'outer: for (const i of trigger.body.items) { break outer; }'],
		['WL005', 'for (const k in trigger.body) { return k; }'],
		['WL006', 'function* g() { yield 1; }\nreturn g;'],
		['WL007', 'return trigger.body.x == 1;'],
		['WL010', "ctx.wait({ name: 'w', duration: 1 });"],
		[
			'WL010',
			"trigger.body.items.forEach(async (i) => { await ctx.wait({ name: 'w', duration: i }); });",
		],
		['WL010', 'await new Promise((r) => r(1));'],
		['WL010', 'setTimeout(() => 1, 10);'],
		['WL013', 'const d = new Date();\nreturn d === d;'],
		['WL011', 'return Math.random();'],
		['WL012', "const r = await fetch('https://x');\nreturn r;"],
		['WL020', 'return /a/.test("a");'],
		['WL020', "return 'abc'.match('a');"],
		['WL020', 'return Math.max(...trigger.body.items);'],
		['WL030', "const n = 'x';\nawait ctx.wait({ name: n, duration: 1 });"],
		[
			'WL031',
			"await ctx.wait({ name: 'w', duration: 1 });\nawait ctx.wait({ name: 'w', duration: 2 });",
		],
	])('rejects with %s: %s', (code, body) => {
		expect(codes(wrap(body))).toContain(code);
	});

	it('rejects module-level mutable state with WL003', () => {
		expect(codes(wrap('return counter;', 'let counter = 0;'))).toContain('WL003');
	});

	it('rejects imports from other modules with WL012', () => {
		expect(codes(wrap('return 1;', "import { readFileSync } from 'node:fs';"))).toContain('WL012');
	});

	it('allows == null', () => {
		expect(codes(wrap('return trigger.body.x == null || trigger.body.x != undefined;'))).toEqual(
			[],
		);
	});

	it('reports a source range, a message and a suggestion', () => {
		const source = wrap('const now = Math.random();\nreturn now;');
		const [d] = compile(source).diagnostics;
		expect(d).toMatchObject({
			code: 'WL011',
			line: 6,
			column: 13,
			suggestion: 'Use ctx.random().',
		});
		expect(source.slice(d.start, d.end)).toBe('Math.random');
		expect(d.message).toContain('Math.random');
	});

	it('reports the duplicate step name at its second use', () => {
		const source = wrap(
			"await ctx.wait({ name: 'w', duration: 1 });\nawait ctx.wait({ name: 'w', duration: 2 });",
		);
		const d = compile(source).diagnostics.find((x) => x.code === 'WL031');
		expect(d?.line).toBe(7);
		expect(d?.suggestion).toBe("name: 'w 2'");
	});

	it('reports type errors with TS codes', () => {
		expect(codes(wrap('const n: number = "x";\nreturn n;'))).toContain('TS2322');
	});
});
