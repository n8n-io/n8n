import type { INode, INodeTypeDescription } from 'n8n-workflow';

import {
	identifyPinDataNodes,
	buildSchemaContexts,
	workflowToMermaid,
	generateEvalPinData,
} from './pin-data-generator';
import type { SimpleWorkflow } from '../../src/types/workflow';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(overrides: Partial<INode> & { name: string; type: string }): INode {
	return {
		name: overrides.name,
		type: overrides.type,
		typeVersion: overrides.typeVersion ?? 1,
		position: overrides.position ?? [0, 0],
		parameters: overrides.parameters ?? {},
		id: overrides.id ?? overrides.name,
		...(overrides.disabled !== undefined ? { disabled: overrides.disabled } : {}),
	} as INode;
}

function makeNodeType(
	name: string,
	opts?: { credentials?: Array<{ name: string }> },
): INodeTypeDescription {
	return {
		displayName: name,
		name,
		group: ['transform'],
		version: 1,
		description: '',
		defaults: { name },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
		...(opts?.credentials ? { credentials: opts.credentials } : {}),
	} as unknown as INodeTypeDescription;
}

// ---------------------------------------------------------------------------
// identifyPinDataNodes
// ---------------------------------------------------------------------------

describe('identifyPinDataNodes', () => {
	const nodeTypes: INodeTypeDescription[] = [
		makeNodeType('n8n-nodes-base.slack', { credentials: [{ name: 'slackApi' }] }),
		makeNodeType('n8n-nodes-base.gmail', { credentials: [{ name: 'gmailOAuth2' }] }),
		makeNodeType('n8n-nodes-base.set'),
		makeNodeType('n8n-nodes-base.if'),
		makeNodeType('n8n-nodes-base.httpRequest'),
		makeNodeType('n8n-nodes-base.webhook'),
	];

	it('should include service nodes with credentials', () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' })],
			connections: {},
		};

		const result = identifyPinDataNodes(workflow, nodeTypes);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Slack');
	});

	it('should exclude utility nodes from deny-list', () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [
				makeNode({ name: 'Set', type: 'n8n-nodes-base.set' }),
				makeNode({ name: 'If', type: 'n8n-nodes-base.if' }),
				makeNode({ name: 'Code', type: 'n8n-nodes-base.code' }),
			],
			connections: {},
		};

		const result = identifyPinDataNodes(workflow, nodeTypes);
		expect(result).toHaveLength(0);
	});

	it('should include HTTP Request and Webhook nodes even without credentials', () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [
				makeNode({ name: 'HTTP', type: 'n8n-nodes-base.httpRequest' }),
				makeNode({ name: 'Hook', type: 'n8n-nodes-base.webhook' }),
			],
			connections: {},
		};

		const result = identifyPinDataNodes(workflow, nodeTypes);
		expect(result).toHaveLength(2);
	});

	it('should skip disabled nodes', () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack', disabled: true })],
			connections: {},
		};

		const result = identifyPinDataNodes(workflow, nodeTypes);
		expect(result).toHaveLength(0);
	});

	it('should handle mixed utility and service nodes', () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [
				makeNode({ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
				makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' }),
				makeNode({ name: 'Set', type: 'n8n-nodes-base.set' }),
				makeNode({ name: 'Gmail', type: 'n8n-nodes-base.gmail' }),
			],
			connections: {},
		};

		const result = identifyPinDataNodes(workflow, nodeTypes);
		expect(result).toHaveLength(2);
		expect(result.map((n) => n.name)).toEqual(['Slack', 'Gmail']);
	});
});

// ---------------------------------------------------------------------------
// buildSchemaContexts
// ---------------------------------------------------------------------------

describe('buildSchemaContexts', () => {
	it('should extract resource and operation from node parameters', () => {
		const nodes: INode[] = [
			makeNode({
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2,
				parameters: { resource: 'message', operation: 'send' },
			}),
		];

		const contexts = buildSchemaContexts(nodes);
		expect(contexts).toHaveLength(1);
		expect(contexts[0]).toMatchObject({
			nodeName: 'Slack',
			nodeType: 'n8n-nodes-base.slack',
			typeVersion: 2,
			resource: 'message',
			operation: 'send',
		});
	});

	it('should handle nodes without resource/operation', () => {
		const nodes: INode[] = [
			makeNode({
				name: 'HTTP',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://example.com' },
			}),
		];

		const contexts = buildSchemaContexts(nodes);
		expect(contexts[0].resource).toBeUndefined();
		expect(contexts[0].operation).toBeUndefined();
	});

	it('should not include schema when nodesBasePath is not provided', () => {
		const nodes: INode[] = [
			makeNode({
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				parameters: { resource: 'message', operation: 'send' },
			}),
		];

		const contexts = buildSchemaContexts(nodes);
		expect(contexts[0].schema).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// workflowToMermaid
// ---------------------------------------------------------------------------

describe('workflowToMermaid', () => {
	it('should generate mermaid flowchart for a simple workflow', () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [
				makeNode({ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
				makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack', typeVersion: 2 }),
			],
			connections: {
				Trigger: {
					main: [[{ node: 'Slack', type: 'main', index: 0 }]],
				},
			},
		};

		const mermaid = workflowToMermaid(workflow);
		expect(mermaid).toContain('flowchart LR');
		expect(mermaid).toContain('Trigger');
		expect(mermaid).toContain('Slack');
		expect(mermaid).toContain('-->');
	});

	it('should include resource and operation in labels', () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [
				makeNode({
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2,
					parameters: { resource: 'message', operation: 'send' },
				}),
			],
			connections: {},
		};

		const mermaid = workflowToMermaid(workflow);
		expect(mermaid).toContain('resource:message');
		expect(mermaid).toContain('op:send');
	});

	it('should handle empty connections', () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [makeNode({ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' })],
			connections: {},
		};

		const mermaid = workflowToMermaid(workflow);
		expect(mermaid).toContain('flowchart LR');
		expect(mermaid).not.toContain('-->');
	});

	it('should handle multi-output connections', () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [
				makeNode({ name: 'If', type: 'n8n-nodes-base.if' }),
				makeNode({ name: 'True', type: 'n8n-nodes-base.set' }),
				makeNode({ name: 'False', type: 'n8n-nodes-base.set' }),
			],
			connections: {
				If: {
					main: [
						[{ node: 'True', type: 'main', index: 0 }],
						[{ node: 'False', type: 'main', index: 0 }],
					],
				},
			},
		};

		const mermaid = workflowToMermaid(workflow);
		// Should have two connection lines
		const arrowCount = (mermaid.match(/-->/g) ?? []).length;
		expect(arrowCount).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// generateEvalPinData (with mocked LLM)
// ---------------------------------------------------------------------------

describe('generateEvalPinData', () => {
	const nodeTypes: INodeTypeDescription[] = [
		makeNodeType('n8n-nodes-base.slack', { credentials: [{ name: 'slackApi' }] }),
		makeNodeType('n8n-nodes-base.linear', { credentials: [{ name: 'linearApi' }] }),
		makeNodeType('n8n-nodes-base.set'),
	];

	function createMockLLM(responseContent: string) {
		return {
			invoke: jest.fn().mockResolvedValue({ content: responseContent }),
		} as never;
	}

	it('should return pin data for service nodes', async () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [
				makeNode({ name: 'Linear', type: 'n8n-nodes-base.linear' }),
				makeNode({ name: 'Set', type: 'n8n-nodes-base.set' }),
				makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' }),
			],
			connections: {},
		};

		const llmResponse = JSON.stringify({
			Linear: [{ json: { id: 'issue-123', title: 'Test Issue' } }],
			Slack: [{ json: { ok: true, channel: 'C123' } }],
		});

		const result = await generateEvalPinData(workflow, {
			llm: createMockLLM(llmResponse),
			nodeTypes,
		});

		expect(Object.keys(result)).toEqual(['Linear', 'Slack']);
		expect(result.Linear).toHaveLength(1);
		expect(result.Slack).toHaveLength(1);
	});

	it('should return empty object when no service nodes exist', async () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [makeNode({ name: 'Set', type: 'n8n-nodes-base.set' })],
			connections: {},
		};

		const llm = createMockLLM('{}');

		const result = await generateEvalPinData(workflow, { llm, nodeTypes });

		expect(result).toEqual({});
		// LLM should not be called
		expect((llm as unknown as { invoke: jest.Mock }).invoke).not.toHaveBeenCalled();
	});

	it('should handle markdown-fenced JSON response', async () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' })],
			connections: {},
		};

		const llmResponse = '```json\n{"Slack": [{"json": {"ok": true}}]}\n```';

		const result = await generateEvalPinData(workflow, {
			llm: createMockLLM(llmResponse),
			nodeTypes,
		});

		expect(result.Slack).toHaveLength(1);
	});

	it('should wrap raw objects in { json: ... } format', async () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' })],
			connections: {},
		};

		// LLM returns items without the { json: ... } wrapper
		const llmResponse = JSON.stringify({
			Slack: [{ ok: true, channel: 'C123' }],
		});

		const result = await generateEvalPinData(workflow, {
			llm: createMockLLM(llmResponse),
			nodeTypes,
		});

		expect(result.Slack).toHaveLength(1);
		expect(result.Slack[0]).toHaveProperty('json');
	});

	it('should return empty object on LLM failure', async () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' })],
			connections: {},
		};

		const llm = {
			invoke: jest.fn().mockRejectedValue(new Error('LLM error')),
		} as never;

		const result = await generateEvalPinData(workflow, { llm, nodeTypes });
		expect(result).toEqual({});
	});

	it('should return empty object on invalid JSON response', async () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' })],
			connections: {},
		};

		const result = await generateEvalPinData(workflow, {
			llm: createMockLLM('not valid json at all'),
			nodeTypes,
		});

		expect(result).toEqual({});
	});

	it('should skip nodes not present in LLM response', async () => {
		const workflow: SimpleWorkflow = {
			name: 'Test',
			nodes: [
				makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' }),
				makeNode({ name: 'Linear', type: 'n8n-nodes-base.linear' }),
			],
			connections: {},
		};

		// LLM only returns data for Slack, not Linear
		const llmResponse = JSON.stringify({
			Slack: [{ json: { ok: true } }],
		});

		const result = await generateEvalPinData(workflow, {
			llm: createMockLLM(llmResponse),
			nodeTypes,
		});

		expect(Object.keys(result)).toEqual(['Slack']);
	});
});
