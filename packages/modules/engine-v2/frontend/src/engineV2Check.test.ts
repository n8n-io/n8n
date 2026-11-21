import * as workflowEngineCheck from '@n8n/workflow-engine-check';
import type { INode } from 'n8n-workflow';

import { engineV2Check } from './engineV2Check';

// Runs the real package, and counts its calls for the cache case.
vi.mock('@n8n/workflow-engine-check', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/workflow-engine-check')>();
	return { ...actual, checkEngineV2Eligibility: vi.fn(actual.checkEngineV2Eligibility) };
});

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

	// Loop Over Items alone gets graph and version reasons, which say nothing about its type.
	it.each(['n8n-nodes-base.set', 'n8n-nodes-base.webhook', 'n8n-nodes-base.splitInBatches'])(
		'reports %s as supported',
		(type) => {
			expect(engineV2Check.isNodeTypeSupported(type)).toBe(true);
		},
	);

	it('checks each node type once', () => {
		const check = vi.mocked(workflowEngineCheck.checkEngineV2Eligibility);
		check.mockClear();

		engineV2Check.isNodeTypeSupported('n8n-nodes-base.noOp');
		engineV2Check.isNodeTypeSupported('n8n-nodes-base.noOp');

		expect(check).toHaveBeenCalledTimes(1);
	});
});
