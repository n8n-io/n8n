import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { detectAgentNamedRefs } from '../detect-agent-named-refs.service';

const wf = (
	nodes: WorkflowJSON['nodes'],
	connections?: WorkflowJSON['connections'],
): WorkflowJSON =>
	({
		name: 't',
		nodes,
		connections: connections ?? {},
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

describe('detectAgentNamedRefs', () => {
	it('returns [] when agent has no named refs', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $json.user_query }}' },
				position: [0, 0],
				id: 'a',
			} as any,
		]);
		expect(detectAgentNamedRefs(workflow, 'Agent')).toEqual([]);
	});

	it("detects single $('Name').item.json.field reference", () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: "={{ $('Voice or Text').item.json.text }}" },
				position: [0, 0],
				id: 'a',
			} as any,
		]);
		const result = detectAgentNamedRefs(workflow, 'Agent');
		expect(result).toEqual([
			{
				nodeName: 'Voice or Text',
				field: 'text',
				originalExpression: "$('Voice or Text').item.json.text",
				column: 'text',
				targetNodeName: 'Agent',
			},
		]);
	});

	it('detects double-quoted form $("Name").item.json.field', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $("Voice or Text").item.json.text }}' },
				position: [0, 0],
				id: 'a',
			} as any,
		]);
		const result = detectAgentNamedRefs(workflow, 'Agent');
		expect(result).toEqual([
			{
				nodeName: 'Voice or Text',
				field: 'text',
				originalExpression: '$("Voice or Text").item.json.text',
				column: 'text',
				targetNodeName: 'Agent',
			},
		]);
	});

	it('detects legacy $node["Name"].json.field form', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $node["Voice or Text"].json.text }}' },
				position: [0, 0],
				id: 'a',
			} as any,
		]);
		const result = detectAgentNamedRefs(workflow, 'Agent');
		expect(result[0].nodeName).toBe('Voice or Text');
		expect(result[0].field).toBe('text');
		expect(result[0].column).toBe('text');
		expect(result[0].targetNodeName).toBe('Agent');
	});

	it('aggregates references across multiple agent parameters', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: {
					text: "={{ $('Voice or Text').item.json.text }}",
					options: { systemMessage: "={{ $('Memory Buffer').item.json.context }}" },
				},
				position: [0, 0],
				id: 'a',
			} as any,
		]);
		const result = detectAgentNamedRefs(workflow, 'Agent');
		expect(result).toHaveLength(2);
		expect(result.map((r) => r.nodeName).sort()).toEqual(['Memory Buffer', 'Voice or Text']);
		expect(result.map((r) => r.column).sort()).toEqual(['context', 'text']);
		expect(result.every((r) => r.targetNodeName === 'Agent')).toBe(true);
	});

	it('dedups same (node, field) appearing multiple times', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: {
					text: "={{ $('Voice or Text').item.json.text }}",
					options: {
						systemMessage: "Use this value: {{ $('Voice or Text').item.json.text }} now",
					},
				},
				position: [0, 0],
				id: 'a',
			} as any,
		]);
		const result = detectAgentNamedRefs(workflow, 'Agent');
		expect(result).toHaveLength(1);
		expect(result[0].column).toBe('text');
		expect(result[0].targetNodeName).toBe('Agent');
	});

	it('disambiguates collision: same field name from different nodes uses node-slug prefix', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: {
					text: "={{ $('Voice or Text').item.json.text }}",
					options: { systemMessage: "={{ $('Memory Buffer').item.json.text }}" },
				},
				position: [0, 0],
				id: 'a',
			} as any,
		]);
		const result = detectAgentNamedRefs(workflow, 'Agent');
		expect(result).toHaveLength(2);
		const cols = result.map((r) => r.column).sort();
		expect(cols).toEqual(['memory_buffer_text', 'voice_or_text_text']);
		expect(result.every((r) => r.targetNodeName === 'Agent')).toBe(true);
	});

	it('throws if the agent node is not in the workflow', () => {
		expect(() => detectAgentNamedRefs(wf([]), 'Missing')).toThrow(/not found/i);
	});

	it('does not return $json.<x> direct refs (only named refs)', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: {
					text: '={{ $json.user_query }}',
					options: { systemMessage: "={{ $('Memory').item.json.context }}" },
				},
				position: [0, 0],
				id: 'a',
			} as any,
		]);
		const result = detectAgentNamedRefs(workflow, 'Agent');
		expect(result).toHaveLength(1);
		expect(result[0].nodeName).toBe('Memory');
		expect(result[0].field).toBe('context');
		expect(result[0].targetNodeName).toBe('Agent');
	});
});

describe('sub-component scanning', () => {
	it('detects named refs in a memory node connected via ai_memory', () => {
		const workflow: WorkflowJSON = {
			name: 't',
			nodes: [
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: { text: '={{ $json.user_query }}' },
					position: [0, 0],
					id: 'a',
				},
				{
					name: 'Postgres Memory',
					type: '@n8n/n8n-nodes-langchain.memoryPostgres',
					typeVersion: 1,
					parameters: { sessionIdExpression: "={{ $('Sender ID').item.json.id }}" },
					position: [0, -100],
					id: 'm',
				},
			],
			connections: {
				'Postgres Memory': { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			},
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;

		const result = detectAgentNamedRefs(workflow, 'Agent');
		expect(result).toEqual([
			{
				nodeName: 'Sender ID',
				field: 'id',
				originalExpression: "$('Sender ID').item.json.id",
				column: 'id',
				targetNodeName: 'Postgres Memory',
			},
		]);
	});

	it('detects named refs in a tool node connected via ai_tool', () => {
		const workflow: WorkflowJSON = {
			name: 't',
			nodes: [
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: {},
					position: [0, 0],
					id: 'a',
				},
				{
					name: 'HTTP Tool',
					type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
					typeVersion: 1,
					parameters: { url: "={{ $('Webhook').item.json.endpoint }}" },
					position: [0, 100],
					id: 't',
				},
			],
			connections: {
				'HTTP Tool': { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
			},
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;

		const result = detectAgentNamedRefs(workflow, 'Agent');
		expect(result).toEqual([
			{
				nodeName: 'Webhook',
				field: 'endpoint',
				originalExpression: "$('Webhook').item.json.endpoint",
				column: 'endpoint',
				targetNodeName: 'HTTP Tool',
			},
		]);
	});

	it('shares column when same source-field referenced from agent AND a sub-component', () => {
		const workflow: WorkflowJSON = {
			name: 't',
			nodes: [
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: { text: "={{ $('Voice').item.json.text }}" },
					position: [0, 0],
					id: 'a',
				},
				{
					name: 'Memory',
					type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
					typeVersion: 1,
					parameters: { sessionIdExpression: "={{ $('Voice').item.json.text }}" },
					position: [0, 100],
					id: 'm',
				},
			],
			connections: {
				Memory: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			},
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;

		const result = detectAgentNamedRefs(workflow, 'Agent');
		// Two NamedRef entries — one per target — sharing the same column.
		expect(result).toHaveLength(2);
		expect(result.every((r) => r.column === 'text')).toBe(true);
		expect(result.map((r) => r.targetNodeName).sort()).toEqual(['Agent', 'Memory']);
	});

	it('disambiguates collision when agent and sub-component reference different sources with same field name', () => {
		const workflow: WorkflowJSON = {
			name: 't',
			nodes: [
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: { text: "={{ $('Voice or Text').item.json.text }}" },
					position: [0, 0],
					id: 'a',
				},
				{
					name: 'Memory',
					type: '@n8n/n8n-nodes-langchain.memoryPostgres',
					typeVersion: 1,
					parameters: { sessionIdExpression: "={{ $('Sender ID').item.json.text }}" },
					position: [0, 100],
					id: 'm',
				},
			],
			connections: {
				Memory: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			},
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;

		const result = detectAgentNamedRefs(workflow, 'Agent');
		expect(result).toHaveLength(2);
		const cols = result.map((r) => r.column).sort();
		expect(cols).toEqual(['sender_id_text', 'voice_or_text_text']);
	});

	it('ignores nodes that are not connected to the agent via ai_* connections', () => {
		const workflow: WorkflowJSON = {
			name: 't',
			nodes: [
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: { text: '={{ $json.user_query }}' },
					position: [0, 0],
					id: 'a',
				},
				{
					name: 'Unrelated Memory',
					type: '@n8n/n8n-nodes-langchain.memoryPostgres',
					typeVersion: 1,
					parameters: { sessionIdExpression: "={{ $('SomeNode').item.json.id }}" },
					position: [200, 0],
					id: 'm',
				},
			],
			connections: {}, // Memory NOT connected to agent
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;

		const result = detectAgentNamedRefs(workflow, 'Agent');
		// Memory's named ref is ignored because Memory isn't a sub-component of Agent.
		expect(result).toEqual([]);
	});
});
