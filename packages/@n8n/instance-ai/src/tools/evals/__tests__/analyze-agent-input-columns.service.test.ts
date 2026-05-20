import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	analyzeAgentEvalInputColumns,
	analyzeAgentInputColumns,
	detectAgentEvalInputRefs,
} from '../analyze-agent-input-columns.service';

type TestNode = Partial<WorkflowJSON['nodes'][number]>;

const wf = (nodes: TestNode[]): WorkflowJSON =>
	({
		name: 't',
		nodes,
		connections: {},
		pinData: {},
		settings: {},
	}) as unknown as WorkflowJSON;

describe('analyzeAgentInputColumns', () => {
	it('extracts $json.<field> from agent prompt parameter', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $json.user_query }}' },
				position: [0, 0],
				id: 'a',
			},
		]);
		const result = analyzeAgentInputColumns(workflow, 'Agent');
		expect(result).toEqual({ agentNodeName: 'Agent', inputColumns: ['user_query'] });
	});

	it('aggregates references across multiple parameters', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: {
					text: '={{ $json.user_query }}',
					options: { systemMessage: '={{ $json.system_prompt }}' },
				},
				position: [0, 0],
				id: 'a',
			},
		]);
		const result = analyzeAgentInputColumns(workflow, 'Agent');
		expect(result.inputColumns.sort()).toEqual(['system_prompt', 'user_query']);
	});

	it('falls back to ["input"] when no $json refs are found', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: 'literal prompt with no expressions' },
				position: [0, 0],
				id: 'a',
			},
		]);
		const result = analyzeAgentInputColumns(workflow, 'Agent');
		expect(result.inputColumns).toEqual(['input']);
	});

	it('throws when the named agent node does not exist', () => {
		const workflow = wf([]);
		expect(() => analyzeAgentInputColumns(workflow, 'Missing')).toThrow(/not found/i);
	});

	it('matches both item.json.<field> and $json.<field>', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: {
					text: '={{ $json.q }}',
					options: { systemMessage: '={{ $input.item.json.context }}' },
				},
				position: [0, 0],
				id: 'a',
			},
		]);
		const result = analyzeAgentInputColumns(workflow, 'Agent');
		expect(result.inputColumns.sort()).toEqual(['context', 'q']);
	});

	it('keeps nested $json paths as separate input columns', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $json.message.text }} {{ $json.message.chat.id }}' },
				position: [0, 0],
				id: 'a',
			},
		]);
		const result = analyzeAgentInputColumns(workflow, 'Agent');
		expect(result.inputColumns.sort()).toEqual(['message.chat.id', 'message.text']);
	});

	it('extracts bracket field references from direct $json access', () => {
		const workflow = wf([
			{
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				parameters: { text: '={{ $json["user-input"] }} {{ $json["123_id"] }}' },
				position: [0, 0],
				id: 'a',
			},
		]);
		const result = analyzeAgentInputColumns(workflow, 'Agent');
		expect(result.inputColumns).toEqual(['user-input', '123_id']);
	});

	it('ignores named-node item refs because they are handled by named-ref detection', () => {
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
			},
		]);
		const result = analyzeAgentInputColumns(workflow, 'Agent');
		expect(result.inputColumns).toEqual([]);
	});
});

describe('analyzeAgentEvalInputColumns', () => {
	it('includes direct $json refs from connected memory sub-components', () => {
		const workflow = {
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
					name: 'Memory',
					type: '@n8n/n8n-nodes-langchain.memoryPostgres',
					typeVersion: 1,
					parameters: { sessionIdExpression: '={{ $json.chat_id }}' },
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

		const result = analyzeAgentEvalInputColumns(workflow, 'Agent');
		expect(result.inputColumns.sort()).toEqual(['chat_id', 'user_query']);
	});

	it('returns direct ref rewrite metadata for nested agent and memory paths', () => {
		const workflow = {
			name: 't',
			nodes: [
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: { text: '={{ $json.message.text }}' },
					position: [0, 0],
					id: 'a',
				},
				{
					name: 'Memory',
					type: '@n8n/n8n-nodes-langchain.memoryPostgres',
					typeVersion: 1,
					parameters: { sessionIdExpression: '={{ $json.message.chat.id }}' },
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

		expect(detectAgentEvalInputRefs(workflow, 'Agent')).toEqual([
			{
				field: 'message.text',
				originalExpression: '$json.message.text',
				column: 'message.text',
				targetNodeName: 'Agent',
			},
			{
				field: 'message.chat.id',
				originalExpression: '$json.message.chat.id',
				column: 'message.chat.id',
				targetNodeName: 'Memory',
			},
		]);
	});
});
