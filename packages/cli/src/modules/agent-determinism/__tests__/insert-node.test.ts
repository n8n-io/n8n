import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { insertNode } from '../trace-workflow-translator';

const draft = (): WorkflowJSON =>
	({
		name: 'draft',
		nodes: [
			{
				id: '1',
				name: 'Shopify Products',
				type: 'x',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Pick items',
				type: 'x',
				typeVersion: 1,
				position: [240, 0],
				parameters: {},
			},
		],
		connections: {
			'Shopify Products': { main: [[{ node: 'Pick items', type: 'main', index: 0 }]] },
		},
	}) as WorkflowJSON;

const split = {
	after: 'Shopify Products',
	name: 'Split products',
	kind: 'splitOut' as const,
	parameters_json: '{"fieldToSplitOut":"products"}',
	why: 'pages hold products',
};

describe('insertNode', () => {
	it('puts the node between the anchor and what the anchor fed', () => {
		const workflow = draft();
		insertNode(workflow, split);

		expect(workflow.connections['Shopify Products'].main).toEqual([
			[{ node: 'Split products', type: 'main', index: 0 }],
		]);
		expect(workflow.connections['Split products'].main).toEqual([
			[{ node: 'Pick items', type: 'main', index: 0 }],
		]);
		expect(workflow.nodes.find((n) => n.name === 'Split products')).toMatchObject({
			type: 'n8n-nodes-base.splitOut',
			parameters: { fieldToSplitOut: 'products' },
		});
	});

	it('skips an unknown anchor, a taken name or bad JSON', () => {
		for (const bad of [
			{ ...split, after: 'Nope' },
			{ ...split, name: 'Pick items' },
			{ ...split, parameters_json: '{' },
		]) {
			const workflow = draft();
			insertNode(workflow, bad);
			expect(workflow.nodes).toHaveLength(2);
		}
	});
});

describe('hashDraft', () => {
	it('ignores layout but sees a changed parameter', async () => {
		const { hashDraft } = await import('../determinism-analysis.service');
		const base = draft();
		const moved = draft();
		moved.nodes[0].position = [999, 999];
		const edited = draft();
		edited.nodes[1].parameters = { conditions: 'changed' };

		expect(hashDraft(moved as never)).toBe(hashDraft(base as never));
		expect(hashDraft(edited as never)).not.toBe(hashDraft(base as never));
	});
});
