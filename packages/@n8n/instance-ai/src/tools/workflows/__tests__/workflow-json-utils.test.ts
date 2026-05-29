import {
	getReferencedWorkflowIds,
	isMockableTriggerNodeType,
	isTriggerNodeType,
	needsWebhookId,
	normalizeWorkflowNodeParameters,
} from '../workflow-json-utils';

describe('workflow-json-utils trigger helpers', () => {
	it.each([
		['n8n-nodes-base.manualTrigger', true],
		['n8n-nodes-base.webhook', true],
		['n8n-nodes-base.formTrigger', true],
		['n8n-nodes-base.scheduleTrigger', true],
		['@n8n/n8n-nodes-langchain.chatTrigger', true],
		['n8n-nodes-base.slackTrigger', true],
		['n8n-nodes-base.httpRequest', false],
		['custom.CustomTrigger', false],
		[undefined, false],
	])('detects mockable trigger type %s as %s', (nodeType, expected) => {
		expect(isMockableTriggerNodeType(nodeType)).toBe(expected);
	});

	it.each([
		['n8n-nodes-base.manualTrigger', true],
		['n8n-nodes-base.webhook', true],
		['n8n-nodes-base.formTrigger', true],
		['n8n-nodes-base.scheduleTrigger', true],
		['@n8n/n8n-nodes-langchain.chatTrigger', true],
		['n8n-nodes-base.slackTrigger', true],
		['custom.CustomTrigger', true],
		['custom.Customtrigger', true],
		['n8n-nodes-base.httpRequest', false],
		['custom.triggerNode', false],
		[undefined, false],
	])('detects trigger type %s as %s', (nodeType, expected) => {
		expect(isTriggerNodeType(nodeType)).toBe(expected);
	});

	it.each([
		['n8n-nodes-base.webhook', true],
		['n8n-nodes-base.formTrigger', true],
		['@n8n/n8n-nodes-langchain.mcpTrigger', true],
		['@n8n/n8n-nodes-langchain.chatTrigger', true],
		['n8n-nodes-base.manualTrigger', false],
		['n8n-nodes-base.scheduleTrigger', false],
		['n8n-nodes-base.slackTrigger', false],
		['custom.CustomTrigger', false],
		[undefined, false],
	])('detects webhook-id requirement for %s as %s', (nodeType, expected) => {
		expect(needsWebhookId(nodeType)).toBe(expected);
	});
});

describe('getReferencedWorkflowIds', () => {
	it('extracts unique static database workflow references', () => {
		expect(
			getReferencedWorkflowIds({
				name: 'Parent workflow',
				nodes: [
					{
						id: 'execute-a',
						name: 'Execute A',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1,
						position: [0, 0],
						parameters: { source: 'database', workflowId: 'wf-a' },
					},
					{
						id: 'execute-a-duplicate',
						name: 'Execute A Again',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1,
						position: [100, 0],
						parameters: { source: 'database', workflowId: { value: 'wf-a' } },
					},
					{
						id: 'execute-expression',
						name: 'Execute Expression',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1,
						position: [200, 0],
						parameters: { source: 'database', workflowId: '={{ $json.workflowId }}' },
					},
					{
						id: 'execute-parameter',
						name: 'Execute Parameter',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1,
						position: [300, 0],
						parameters: { source: 'parameter', workflowId: 'wf-parameter' },
					},
					{
						id: 'execute-disabled',
						name: 'Execute Disabled',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1,
						position: [400, 0],
						disabled: true,
						parameters: { source: 'database', workflowId: 'wf-disabled' },
					},
					{
						id: 'execute-b',
						name: 'Execute B',
						type: 'n8n-nodes-base.executeWorkflow',
						typeVersion: 1,
						position: [500, 0],
						parameters: { workflowId: { value: ' wf-b ' } },
					},
				],
				connections: {},
			}),
		).toEqual(['wf-a', 'wf-b']);
	});
});

describe('normalizeWorkflowNodeParameters', () => {
	it('normalizes non-object node parameters in place', () => {
		const json = {
			name: 'Workflow',
			nodes: [
				{
					id: 'null-parameters',
					name: 'Null Parameters',
					type: 'n8n-nodes-base.set',
					typeVersion: 3,
					position: [0, 0],
					parameters: null,
				},
				{
					id: 'array-parameters',
					name: 'Array Parameters',
					type: 'n8n-nodes-base.set',
					typeVersion: 3,
					position: [100, 0],
					parameters: [],
				},
				{
					id: 'object-parameters',
					name: 'Object Parameters',
					type: 'n8n-nodes-base.set',
					typeVersion: 3,
					position: [200, 0],
					parameters: { keep: true },
				},
			],
			connections: {},
		} as Parameters<typeof normalizeWorkflowNodeParameters>[0];

		normalizeWorkflowNodeParameters(json);

		expect(json.nodes?.map((node) => node.parameters)).toEqual([{}, {}, { keep: true }]);
	});
});
