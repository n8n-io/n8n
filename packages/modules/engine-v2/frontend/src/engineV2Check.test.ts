import type { INode } from 'n8n-workflow';

import { engineV2Check } from './engineV2Check';

function node(type: string, overrides: Partial<INode> = {}): INode {
	return {
		id: `id-${type}`,
		name: type.split('.').pop() ?? type,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

describe('engineV2Check.checkWorkflow', () => {
	it('reports an empty workflow as eligible', () => {
		expect(engineV2Check.checkWorkflow({ nodes: [], connections: {}, settings: {} })).toEqual({
			eligible: true,
			reasons: [],
		});
	});

	it('returns the reason of a workflow setting', () => {
		const result = engineV2Check.checkWorkflow({
			nodes: [],
			connections: {},
			settings: { errorWorkflow: 'wf-1' },
		});

		expect(result.eligible).toBe(false);
		expect(result.reasons).toEqual([
			expect.objectContaining({ code: 'ERROR_WORKFLOW', severity: 'blocking' }),
		]);
	});

	it('returns the reason of a node, with its name', () => {
		const result = engineV2Check.checkWorkflow({
			nodes: [node('n8n-nodes-base.formTrigger', { name: 'On form submission' })],
			connections: {},
			settings: {},
		});

		expect(result.reasons).toContainEqual(
			expect.objectContaining({ code: 'FORM_NODE', nodeName: 'On form submission' }),
		);
	});
});

describe('engineV2Check.isNodeTypeSupported', () => {
	it.each([
		['n8n-nodes-base.formTrigger', 'FORM_NODE'],
		['@n8n/n8n-nodes-langchain.agent', 'AI_NODE'],
		['n8n-nodes-base.kafkaTrigger', 'TRIGGER_WAITS_FOR_RUN'],
		['n8n-nodes-acme.example', 'COMMUNITY_NODE'],
	])('reports %s as unsupported (%s)', (type) => {
		expect(engineV2Check.isNodeTypeSupported(type)).toBe(false);
	});

	it.each(['n8n-nodes-base.set', 'n8n-nodes-base.webhook', 'n8n-nodes-base.splitInBatches'])(
		'reports %s as supported',
		(type) => {
			expect(engineV2Check.isNodeTypeSupported(type)).toBe(true);
		},
	);
});
