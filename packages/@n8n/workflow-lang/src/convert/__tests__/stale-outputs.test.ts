/**
 * A connection from an output that a node does not have (a stale connection).
 * v1 records no output for it, so the run data of the node keeps only the
 * outputs that it has. The converter reads those from the parameters of the
 * node type when they depend on them, and else from its description.
 */
import { describe, expect, it } from 'vitest';

import type { ReferenceOutput } from '../../reference/runner.ts';
import { runReference } from '../../reference/runner.ts';
import { knownMainOutputs } from '../host-node.ts';
import { convertWorkflow } from '../index.ts';
import { connect, node, webhookNode } from './workflows.ts';

const wf = (nodes: unknown[], connections: unknown) => ({
	name: 'Stale outputs',
	nodes,
	connections,
	settings: { executionOrder: 'v1' },
});

function converted(input: unknown, trace: 'core' | 'all' = 'core'): string {
	const r = convertWorkflow(input, { trace });
	expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
	return r.source;
}

async function run(source: string): Promise<ReferenceOutput> {
	return await runReference(source, {
		trigger: { body: { n: 1 }, headers: {}, query: {} },
		now: 1_700_000_000_000,
		seed: 1,
		effects: {},
		trace: true,
	});
}

/** The output lists that a node recorded: one list for each output, with the items of the run. */
function lists(out: ReferenceOutput, step: string): unknown[] {
	const record = (out.trace ?? []).find((t) => t.step === step);
	expect(record, step).toBeDefined();
	const items = record?.items;
	if (!Array.isArray(items) || items.length === 0) return [items];
	// One output: the item list. Several outputs: one list for each output.
	return items.every((x) => Array.isArray(x)) ? items : [items];
}

const code = (parameters: Record<string, unknown>) => node('Code', 'code', 2, [200, 0], parameters);

describe('a connection from an output that the node does not have', () => {
	it('gives a Code node one output list, as v1', async () => {
		const source = converted(
			wf(
				[
					webhookNode(),
					code({ jsCode: 'return [{ json: { n: $json.body.n } }, { json: { n: 2 } }];' }),
					node('Real', 'noOp', 1, [400, 0]),
					node('Stale', 'noOp', 1, [400, 200]),
				],
				connect([
					['Webhook', 0, 'Code', 0],
					['Code', 0, 'Real', 0],
					['Code', 1, 'Stale', 0],
				]),
			),
		);
		const out = await run(source);
		expect(out.status).toBe('ok');
		const traced = lists(out, 'Code');
		expect(traced).toHaveLength(1);
		expect(traced[0]).toHaveLength(2);
	});

	it('gives a Sort node one output list', async () => {
		const source = converted(
			wf(
				[
					webhookNode(),
					node('Sorted', 'sort', 1, [200, 0], {
						sortFieldsUi: { sortField: [{ fieldName: 'body.n', order: 'descending' }] },
					}),
					node('Real', 'noOp', 1, [400, 0]),
					node('Stale', 'noOp', 1, [400, 200]),
				],
				connect([
					['Webhook', 0, 'Sorted', 0],
					['Sorted', 0, 'Real', 0],
					['Sorted', 1, 'Stale', 0],
				]),
			),
		);
		const out = await run(source);
		expect(out.status).toBe('ok');
		expect(lists(out, 'Sorted')).toHaveLength(1);
	});

	it('gives a node that runs whole in the host one output list', async () => {
		// The step node itself runs in the fallback host; its answer is the one output list below.
		const source = converted(
			wf(
				[
					webhookNode(),
					node('Format', 'dateTime', 2, [200, 0], {
						operation: 'formatDate',
						date: '2024-01-02T12:00:00.000Z',
						format: 'yyyy-MM-dd',
						options: {},
					}),
					node('Real', 'noOp', 1, [400, 0]),
					node('Stale', 'noOp', 1, [400, 200]),
				],
				connect([
					['Webhook', 0, 'Format', 0],
					['Format', 0, 'Real', 0],
					['Format', 2, 'Stale', 0],
				]),
			),
			'all',
		);
		const out = await runReference(source, {
			trigger: { body: { n: 1 }, headers: {}, query: {} },
			now: 1_700_000_000_000,
			seed: 1,
			effects: { Format: [[{ json: { formattedDate: '2024-01-02' } }]] },
			trace: true,
		});
		expect(out.status).toBe('ok');
		expect(lists(out, 'Format')).toHaveLength(1);
	});

	it('keeps the outputs of a node that runs whole in the host', async () => {
		const conditions = {
			options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
			conditions: [
				{
					id: 'c1',
					leftValue: '={{ $json.body.n }}',
					rightValue: '^[A-Z]{2}-\\d{3}$',
					operator: { type: 'string', operation: 'regex' },
				},
			],
			combinator: 'and',
		};
		const source = converted(
			wf(
				[
					webhookNode(),
					node('Valid', 'if', 2.2, [200, 0], { conditions, options: {} }),
					node('True', 'noOp', 1, [400, 0]),
					node('False', 'noOp', 1, [400, 200]),
					node('Stale', 'noOp', 1, [400, 400]),
				],
				connect([
					['Webhook', 0, 'Valid', 0],
					['Valid', 0, 'True', 0],
					['Valid', 1, 'False', 0],
					['Valid', 2, 'Stale', 0],
				]),
			),
		);
		const out = await run(source);
		expect(out.status).toBe('ok');
		expect(lists(out, 'Valid')).toHaveLength(2);
	});

	it('keeps the error output of `continueErrorOutput`', async () => {
		const source = converted(
			wf(
				[
					webhookNode(),
					node('Errors', 'set', 3.4, [200, 0], {}, { onError: 'continueErrorOutput' }),
					node('Real', 'noOp', 1, [400, 0]),
					node('Failed', 'noOp', 1, [400, 200]),
				],
				connect([
					['Webhook', 0, 'Errors', 0],
					['Errors', 0, 'Real', 0],
					['Errors', 1, 'Failed', 0],
				]),
			),
		);
		expect(knownMainOutputs({ name: 'Errors', type: 'n8n-nodes-base.set', typeVersion: 3.4 })).toBe(
			1,
		);
		const out = await run(source);
		expect(out.status).toBe('ok');
		expect(lists(out, 'Errors')).toHaveLength(2);
	});

	it('keeps a Switch in expression mode as it is', async () => {
		const source = converted(
			wf(
				[
					webhookNode(),
					node('Switch', 'switch', 3.2, [200, 0], {
						mode: 'expression',
						numberOutputs: 2,
						output: '={{ $json.body.n }}',
						options: {},
					}),
					node('One', 'noOp', 1, [400, 0]),
					node('Two', 'noOp', 1, [400, 200]),
					node('Stale', 'noOp', 1, [400, 400]),
				],
				connect([
					['Webhook', 0, 'Switch', 0],
					['Switch', 0, 'One', 0],
					['Switch', 1, 'Two', 0],
					['Switch', 3, 'Stale', 0],
				]),
			),
		);
		const out = await run(source);
		expect(out.status).toBe('ok');
		// The expression names the outputs, so the connection from output 3 keeps its empty list.
		expect(lists(out, 'Switch')).toHaveLength(4);
	});
});
