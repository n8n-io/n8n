/**
 * The context of a library node (spec 4.2): `ctx.random()` and
 * `ctx.wait({ duration })`. The wait is a pause inside the step of the caller,
 * so it uses no result of the fixture. The bytecode gives what the reference
 * runner gives.
 */
import { compile } from '../compiler/index.ts';
import { decodeModule } from '../compiler/decode.ts';
import { runReference } from '../reference/runner.ts';
import { runModule } from '../testing/vm.ts';

const workflow = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'x', method: 'POST' })],
	async run(ctx) {
		const items = await ctx.node({ name: 'Node', type: 'test.pause', typeVersion: 1, parameters: {} });
		return { items, now: ctx.now() };
	},
});
`;

const node = (body: string) => `import { defineNode } from '@n8n/workflow-lang';

export default defineNode<any>({
	type: 'test.pause',
	version: 1,
	async run(ctx, parameters, items, credential) {
${body}
	},
});
`;

const fixture = {
	trigger: { body: {} },
	now: 1000,
	seed: 7,
	effects: { Node: [{ status: 200, headers: {}, body: { n: 1 } }] },
};

describe('the context of a library node', () => {
	it('pauses inside the step and keeps the results of the fixture for the requests', async () => {
		const nodes = {
			'nodes/pause.ts': node(
				[
					'const r: number = ctx.random();',
					'await ctx.wait({ duration: 250 });',
					"const response: any = await ctx.http({ method: 'GET', url: 'https://example.test/', headers: {}, qs: {}, body: undefined });",
					'await ctx.wait({ duration: 50 });',
					'return [{ n: response.body.n, inRange: r >= 0 && r < 1 }];',
				].join('\n'),
			),
		};
		const compiled = compile(workflow, { nodes });
		expect(compiled.diagnostics).toEqual([]);
		const reference = await runReference(workflow, fixture, { nodes });
		const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
		expect(reference.status).toBe('ok');
		expect(reference.result).toEqual({ items: [{ n: 1, inRange: true }], now: 1300 });
		expect(reference.effects.map((e) => e.kind)).toEqual(['wait', 'http', 'wait']);
		expect(reference.effects[0]).toEqual({ step: 'Node', kind: 'wait', args: { duration: 250 } });
		expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	});

	it('gives the same random numbers in the reference runner and in the bytecode', async () => {
		const nodes = { 'nodes/pause.ts': node('return [{ a: ctx.random(), b: ctx.random() }];') };
		const compiled = compile(workflow, { nodes });
		expect(compiled.diagnostics).toEqual([]);
		const reference = await runReference(workflow, fixture, { nodes });
		const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
		expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	});

	it('rejects the other ctx calls with WL012', () => {
		const nodes = { 'nodes/pause.ts': node('return [{ at: ctx.now() }];') };
		expect(compile(workflow, { nodes }).diagnostics.map((d) => d.code)).toContain('WL012');
	});
});
