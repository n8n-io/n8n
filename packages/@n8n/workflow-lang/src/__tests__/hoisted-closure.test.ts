/**
 * A function declaration inside `run` that captures a `let` or `const` of
 * `run`: the closure is made at the start of the block (hoisting), so the cell
 * of the variable must exist before it. The bytecode then gives what
 * JavaScript gives. The same applies to an arrow function or a function
 * expression that the block makes before the declaration of a variable that
 * it reads.
 */
import { compile } from '../compiler/index.ts';
import { decodeModule } from '../compiler/decode.ts';
import { runReference } from '../reference/runner.ts';
import { runModule } from '../testing/vm.ts';

const source = (body: string) => `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'x', method: 'POST' })],
	async run() {
${body}
	},
});
`;

const fixture = { trigger: { body: {} }, now: 0, seed: 1, effects: {} };

describe('hoisted function declarations', () => {
	it.each([
		[
			'a let that changes after the declaration',
			'let n = 0;\nfunction read(): number { return n; }\nn = 5;\nreturn read();',
		],
		[
			'a const declared before',
			'const o = { k: 1 };\nfunction read(): number { return o.k; }\nreturn read();',
		],
		[
			'a call before the declaration',
			'const r = read();\nlet n = 2;\nfunction read(): number { return 7; }\nreturn r + n;',
		],
		// An arrow function is not hoisted, but it can capture a variable that the block
		// declares after it: the cell must exist when the closure is made.
		[
			'an arrow function before a const that it reads',
			"const label = (x: string): string => prefix + x;\nconst prefix = 'n-';\nreturn label('a');",
		],
		[
			'an arrow function before a let that changes',
			'const read = (): number => n * 2;\nlet n = 1;\nn += 4;\nreturn read();',
		],
		[
			'a function expression before a const, in a nested block',
			"const out: string[] = [];\nfor (const k of [1, 2]) {\n  const show = function (): string { return tag + k; };\n  const tag = 't';\n  out.push(show());\n}\nreturn out.join(',');",
		],
		[
			'an arrow function before a const, with a function declaration in the block',
			'const read = (): number => n + other();\nconst n = 1;\nfunction other(): number { return 10; }\nreturn read();',
		],
		[
			'two arrow functions that read each other and a later const',
			'const a = (x: number): number => (x > 0 ? b(x - 1) + step : 0);\nconst b = (x: number): number => a(x);\nconst step = 2;\nreturn a(3);',
		],
	])('%s', async (_label, body) => {
		const src = source(body);
		const compiled = compile(src);
		expect(compiled.diagnostics).toEqual([]);
		const reference = await runReference(src, fixture);
		const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
		expect(reference.status).toBe('ok');
		expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	});
});
