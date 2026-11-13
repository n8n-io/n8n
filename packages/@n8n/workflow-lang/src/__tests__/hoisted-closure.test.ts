/**
 * A function declaration inside `run` that captures a `let` or `const` of
 * `run`: the closure is made at the start of the block (hoisting), so the cell
 * of the variable must exist before it. The bytecode then gives what
 * JavaScript gives.
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
