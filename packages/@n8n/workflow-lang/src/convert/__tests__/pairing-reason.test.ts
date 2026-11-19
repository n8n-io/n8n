/**
 * A read of a paired item that is not compiled names the reason at the end of its
 * diagnostic, in a fixed form: `[pairing: <reason>]`. The reason has node types and
 * settings only, so a count over many workflows can group it. It never has a node name or
 * a parameter value.
 *
 * Each workflow is `Webhook` → `Source` (three items) → the nodes of the case → two
 * readers of `$('Source').item`: a Code node that runs in the fallback host (it has a
 * class) and a Set node with an expression.
 */
import { describe, expect, it } from 'vitest';

import { convertWorkflow } from '../index.ts';
import { connect, node, webhookNode } from './workflows.ts';

const SOURCE = node('Source', 'code', 2, [200, 0], {
	jsCode: "return [{ json: { id: 'a' } }, { json: { id: 'b' } }, { json: { id: 'c' } }];",
});

const reader = (target: string) =>
	node('Secret Reader', 'code', 2, [800, 0], {
		mode: 'runOnceForEachItem',
		jsCode: `class Box {}\nreturn { json: { id: $('${target}').item.json.id } };`,
	});

const expression = (target: string) =>
	node('Secret Expression', 'set', 3.4, [800, 200], {
		mode: 'raw',
		jsonOutput: `={ "id": "{{ $('${target}').item.json.id }}" }`,
		options: {},
	});

const http = (options: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
	node(
		'Secret Request',
		'httpRequest',
		4.2,
		[400, 0],
		{ method: 'POST', url: 'https://api.example.test/things', options },
		extra,
	);

const set = (name: string, extra: Record<string, unknown> = {}) =>
	node(
		name,
		'set',
		3.4,
		[400, 0],
		{
			assignments: { assignments: [{ id: '1', name: 'seen', value: true, type: 'boolean' }] },
			includeOtherFields: true,
			options: {},
		},
		extra,
	);

/** The reasons of the two readers, from the end of their diagnostics. */
function reasons(
	between: Array<ReturnType<typeof node>>,
	edges: Array<[string, number, string, number]>,
	target = 'Source',
) {
	const last = between.at(-1)?.name ?? 'Source';
	const result = convertWorkflow({
		name: 'Pairing reason',
		nodes: [webhookNode(), SOURCE, ...between, reader(target), expression(target)],
		connections: connect([
			['Webhook', 0, 'Source', 0],
			...edges,
			[last, 0, 'Secret Reader', 0],
			[last, 0, 'Secret Expression', 0],
		]),
		settings: { executionOrder: 'v1' },
	});
	const of = (code: string, name: string) => {
		const found = result.diagnostics.find((d) => d.code === code && d.node === name);
		return found === undefined ? undefined : /\[pairing: (.*)\]$/.exec(found.message)?.[1];
	};
	return {
		code: of('code-node-reference', 'Secret Reader'),
		expression: of('paired-item', 'Secret Expression'),
		messages: result.diagnostics.map((d) => d.message),
	};
}

describe('the reason of a read of a paired item that is not compiled', () => {
	it('names the exit of an HTTP Request node that keeps no paired items', () => {
		const paged = reasons(
			[
				http({
					pagination: {
						pagination: {
							paginationMode: 'updateAParameterInEachRequest',
							parameters: { parameters: [{ name: 'page', value: '={{ $pageCount }}' }] },
							paginationCompleteWhen: 'responseIsEmpty',
							limitPagesFetched: true,
							maxRequests: 2,
						},
					},
					response: { response: { responseFormat: 'json' } },
				}),
			],
			[['Source', 0, 'Secret Request', 0]],
		);
		const pagination = 'no pairs after n8n-nodes-base.httpRequest@4.2 (pagination)';
		expect(paged.code).toBe(pagination);
		expect(paged.expression).toBe(pagination);

		// With "retry on fail" the node keeps the paired items of its last run: no refusal.
		const retried = reasons(
			[http({}, { retryOnFail: true })],
			[['Source', 0, 'Secret Request', 0]],
		);
		expect(retried.code).toBeUndefined();
		expect(retried.expression).toBeUndefined();
	});

	it('names a second node with several connections on the way', () => {
		// One node with several connections picks the connection of its latest run, as v1 does.
		// A second one on the way has no compiled form.
		const out = reasons(
			[set('Left'), set('Right'), set('Both'), set('Upper'), set('Lower'), set('Last')],
			[
				['Source', 0, 'Left', 0],
				['Source', 0, 'Right', 0],
				['Left', 0, 'Both', 0],
				['Right', 0, 'Both', 0],
				['Both', 0, 'Upper', 0],
				['Both', 0, 'Lower', 0],
				['Upper', 0, 'Last', 0],
				['Lower', 0, 'Last', 0],
			],
		);
		const several =
			'engine form of the workflow: several nodes with several connections on the way';
		expect(out.code).toBe(several);
		expect(out.expression).toBe(several);
	});

	it('names a node with "execute once"', () => {
		const out = reasons(
			[set('Secret Once', { executeOnce: true })],
			[['Source', 0, 'Secret Once', 0]],
		);
		expect(out.code).toBe('executeOnce on n8n-nodes-base.set@3.4');
		expect(out.expression).toBe('executeOnce on n8n-nodes-base.set@3.4');
	});

	it('names a node that runs in the fallback host', () => {
		const host = node('Secret Step', 'code', 2, [400, 0], {
			jsCode: 'class Box {}\nreturn items.slice(1);',
		});
		const out = reasons([host], [['Source', 0, 'Secret Step', 0]]);
		expect(out.code).toBe('no pairs after n8n-nodes-base.code@2 (in the host)');
		expect(out.expression).toBe('no pairs after n8n-nodes-base.code@2 (in the host)');
	});

	it('names a reader in the host that reads a node with one item', () => {
		// The node after the trigger runs in the host and has the one item of the trigger as its
		// input, so the walk follows the path. The code in the host has no proof for that form.
		const result = convertWorkflow({
			name: 'Pairing reason',
			nodes: [
				webhookNode(),
				node('Secret Step', 'code', 2, [200, 0], {
					jsCode: "class Box {}\nreturn [{ json: { id: 'a' } }, { json: { id: 'b' } }];",
				}),
				reader('Webhook'),
			],
			connections: connect([
				['Webhook', 0, 'Secret Step', 0],
				['Secret Step', 0, 'Secret Reader', 0],
			]),
			settings: { executionOrder: 'v1' },
		});
		const refusal = result.diagnostics.find((d) => d.code === 'code-node-reference');
		expect(refusal?.message.endsWith('[pairing: reader in the host, target with one item]')).toBe(
			true,
		);
	});

	it('keeps the first sentence of each message, and gives no name of a node in the reason', () => {
		const out = reasons(
			[set('Secret Once', { executeOnce: true })],
			[['Source', 0, 'Secret Once', 0]],
		);
		expect(out.messages).toContain(
			'An expression pairs items of another node by position. [pairing: executeOnce on n8n-nodes-base.set@3.4]',
		);
		expect(
			out.messages.some((m) =>
				m.startsWith(
					'The code reads the item of node "Source" that pairs with an input item, and the pairing is not known: v1 follows the paired items of each node on the way. [pairing: ',
				),
			),
		).toBe(true);
		for (const m of out.messages) {
			const reason = /\[pairing: (.*)\]$/.exec(m)?.[1] ?? '';
			expect(reason).not.toMatch(/Secret|Source/);
		}
	});
});
