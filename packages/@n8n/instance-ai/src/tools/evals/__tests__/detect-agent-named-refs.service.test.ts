import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { detectAgentNamedRefs } from '../detect-agent-named-refs.service';

const wf = (nodes: WorkflowJSON['nodes']): WorkflowJSON =>
	({
		name: 't',
		nodes,
		connections: {},
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
	});
});
