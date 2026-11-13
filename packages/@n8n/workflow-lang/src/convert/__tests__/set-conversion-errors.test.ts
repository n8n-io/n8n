/**
 * The "Ignore Type Conversion Errors" option of the Edit Fields (Set) node, against v1:
 * a value that fails the conversion stays as it is, and an error names the item index.
 */
import { compile } from '../../compiler/index.ts';
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';

const BODY = {
	rows: [
		{ n: '1', list: { a: 1 } },
		{ n: 'abc', list: { a: 2 } },
	],
};

function workflow(
	assignments: Array<Record<string, unknown>>,
	options: Record<string, unknown> = {},
	onError?: string,
) {
	return {
		name: 'Set conversion',
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p' },
			},
			{
				name: 'Split',
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				position: [200, 0],
				parameters: { fieldToSplitOut: 'body.rows', options: {} },
			},
			{
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [400, 0],
				parameters: { assignments: { assignments }, options },
				...(onError === undefined ? {} : { onError }),
			},
		],
		connections: {
			Hook: { main: [[{ node: 'Split', type: 'main', index: 0 }]] },
			Split: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

const field = (name: string, type: string, value: string) => [{ id: name, name, value, type }];

async function run(source: string) {
	return await runReference(source, {
		trigger: { body: BODY },
		now: 0,
		seed: 1,
		effects: {},
	});
}

describe('Set node: ignore type conversion errors', () => {
	it('keeps the value of each field that fails the conversion', async () => {
		const converted = convertWorkflow(
			workflow(
				[
					...field('list', 'array', '={{ $json.list }}'),
					...field('params', 'object', '={{ "12x" }}'),
					...field('count', 'number', '={{ "abc" }}'),
					...field('active', 'boolean', '={{ "maybe" }}'),
					...field('label', 'string', '={{ "Ada" }}'),
				],
				{ ignoreConversionErrors: true },
			),
		);
		expect(converted.ok).toBe(true);
		const compiled = compile(converted.source);
		expect(compiled.diagnostics).toEqual([]);
		const out = await run(converted.source);
		expect(out.status).toBe('ok');
		expect((out.result as Record<string, unknown>).Set).toEqual([
			{ list: { a: 1 }, params: '12x', count: 'abc', active: 'maybe', label: 'Ada' },
			{ list: { a: 2 }, params: '12x', count: 'abc', active: 'maybe', label: 'Ada' },
		]);
	});

	it('fails with the text and the item index of v1', async () => {
		const converted = convertWorkflow(workflow(field('n', 'number', '={{ $json.n }}')));
		expect(converted.ok).toBe(true);
		const out = await run(converted.source);
		expect(out.status).toBe('error');
		expect((out.result as { message?: string }).message).toBe(
			"'n' expects a number but we got 'abc' [item 1]",
		);
	});

	it('continues with the error as the item, as v1 does', async () => {
		const converted = convertWorkflow(
			workflow(field('n', 'number', '={{ $json.n }}'), {}, 'continueRegularOutput'),
		);
		expect(converted.ok).toBe(true);
		const out = await run(converted.source);
		expect(out.status).toBe('ok');
		expect((out.result as Record<string, unknown>).Set).toEqual([
			{ n: 1 },
			{ error: "'n' expects a number but we got 'abc' [item 1]" },
		]);
	});

	it('gives the option to the helpers only when the node sets it', () => {
		const convert = (options: Record<string, unknown>) =>
			convertWorkflow(workflow(field('n', 'number', '={{ $json.n }}'), options)).source;
		expect(convert({ ignoreConversionErrors: true })).toContain("asNumber($json.n, 'n', i, true)");
		expect(convert({})).toContain("asNumber($json.n, 'n', i)");
	});
});
