/**
 * The converter and the compiler must not hang, overflow the stack or run out
 * of memory on unusual input. Each case is a small hand-written workflow.
 */
import { compile } from '../../compiler/index.ts';
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';

const workflow = (code: string, value: string) => ({
	name: 'Robust',
	nodes: [
		{
			name: 'Hook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [0, 0],
			parameters: { path: 'a' },
		},
		{
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [200, 0],
			parameters: {
				assignments: { assignments: [{ id: 'a', name: 'v', type: 'string', value }] },
				options: {},
			},
		},
		{
			name: 'Code',
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [400, 0],
			parameters: { jsCode: code },
		},
	],
	connections: {
		Hook: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
		Set: { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
	},
});

describe('converter robustness', () => {
	it('keeps control characters of user text, which the generator uses as markers', () => {
		const code =
			"const crypto = require('crypto');\nreturn items.map((i) => ({ json: { k: ['a', 'b'].join('\\u0001') } }));".replace(
				'\\u0001',
				'\u0001',
			);
		const started = Date.now();
		const out = convertWorkflow(workflow(code, 'x\u0001y\u0002z\u0003'), { trace: 'all' });
		expect(Date.now() - started).toBeLessThan(20_000);
		expect(out.ok).toBe(true);
		expect([...out.source].some((ch) => ch >= '\u0001' && ch <= '\u0003')).toBe(false);
		expect(out.source).toContain('x\\u0001y\\u0002z\\u0003');
	});

	it('compiles a function larger than the argument limit of a spread', () => {
		const body = Array.from({ length: 70_000 }, (_, i) => `\t\tx = x + ${i % 7};`).join('\n');
		const source = [
			"import { webhook, workflow } from '@n8n/workflow-lang';",
			'export default workflow({',
			"\ttriggers: [webhook({ path: 'a', method: 'POST' })],",
			'\tasync run(ctx, trigger) {',
			'\t\tlet x = 0;',
			body,
			'\t\treturn { x };',
			'\t},',
			'});',
			'',
		].join('\n');
		const out = compile(source, { fileName: '/workflow.ts' });
		expect(out.diagnostics).toEqual([]);
		expect(out.ok).toBe(true);
	}, 60_000);

	it('converts odd but valid workflows', () => {
		const base = workflow('return items;', '={{ $json.a // a comment\n}} and more');
		// A trailing line comment in an expression of a text template.
		expect(convertWorkflow(base).ok).toBe(true);
		// A sticky note with a connection, and connections under keys that v1 does not follow.
		const odd = {
			...base,
			nodes: [
				...base.nodes,
				{
					name: 'Note',
					type: 'n8n-nodes-base.stickyNote',
					typeVersion: 1,
					position: [0, 200],
					parameters: {},
				},
			],
			connections: {
				...base.connections,
				Code: {
					main: [[{ node: 'Note', type: 'main', index: 0 }]],
					done: [[{ node: 'Set', type: 'main', index: 0 }]],
					error: [[{ node: 'Set', type: 'error', index: 0 }]],
				},
			},
		};
		const out = convertWorkflow(odd);
		expect(out.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	});

	it('gives a source that compiles when a Code node reads itself', () => {
		const out = convertWorkflow(
			workflow("const c = require('crypto');\nreturn $('Code').all();", 'x'),
			{ trace: 'all' },
		);
		expect(out.ok).toBe(true);
		expect(compile(out.source, { fileName: '/workflow.ts' }).ok).toBe(true);
	});

	it('translates Boolean, String and Number as callback values', async () => {
		const out = convertWorkflow(
			workflow('return items;', "={{ [1, 0, 2].filter(Boolean).map(String).join('-') }}"),
			{ trace: 'all' },
		);
		expect(out.ok).toBe(true);
		const run = await runReference(out.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: { Code: [[{}]] },
			trace: true,
		});
		const set = (run.trace ?? []).find((t) => t.step === 'Set')?.items;
		expect(set).toEqual([{ v: '1-2' }]);
	});

	it('traces the node that fails the run, with the message and description of n8n', async () => {
		const wf = {
			name: 'Fail',
			nodes: [
				{
					name: 'Hook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 0],
					parameters: { path: 'a' },
				},
				{
					name: 'Call',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [200, 0],
					parameters: { url: 'https://api.example.test/x', options: {} },
				},
			],
			connections: { Hook: { main: [[{ node: 'Call', type: 'main', index: 0 }]] } },
		};
		const out = convertWorkflow(wf, { trace: 'all' });
		expect(out.ok).toBe(true);
		const run = await runReference(out.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: {
				Call: [
					{
						status: 401,
						headers: { 'content-type': 'application/json' },
						body: { message: 'Unauthorized' },
					},
				],
			},
			trace: true,
		});
		expect(run.status).toBe('error');
		const failed = (run.trace ?? []).find((t) => t.step === 'Call');
		expect(failed?.items).toEqual({
			$error: {
				message: 'Authorization failed - please check your credentials',
				description: 'Unauthorized',
			},
		});
	});

	it('fails with a diagnostic when the time budget is spent', () => {
		// `==` fails the first compile, so the conversion needs a second round.
		const out = convertWorkflow(workflow('return items;', '={{ $json.a == 1 }}'), {
			budgetMs: -1,
		});
		expect(out.ok).toBe(false);
		expect(out.diagnostics.map((d) => d.code)).toContain('budget');
	});
});
