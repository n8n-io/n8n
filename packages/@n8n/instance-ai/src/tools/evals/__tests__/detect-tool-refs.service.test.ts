import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { detectToolRefs } from '../detect-tool-refs.service';

const node = (overrides: Partial<WorkflowJSON['nodes'][number]>): WorkflowJSON['nodes'][number] =>
	({
		name: 'Node',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		parameters: {},
		position: [0, 0],
		id: 'n',
		...overrides,
	}) as WorkflowJSON['nodes'][number];

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

describe('detectToolRefs', () => {
	it('returns [] when the agent has no sub-components', () => {
		const workflow = wf([node({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', id: 'a' })]);
		expect(detectToolRefs(workflow, 'Agent')).toEqual([]);
	});

	it("ignores refs that live on the agent's own parameters", () => {
		const workflow = wf([
			node({
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				id: 'a',
				parameters: { text: "={{ $('Telegram Trigger').item.json.message }}" },
			}),
			node({ name: 'Telegram Trigger', type: 'n8n-nodes-base.telegramTrigger', id: 't' }),
		]);
		expect(detectToolRefs(workflow, 'Agent')).toEqual([]);
	});

	it('detects a named ref inside an ai_tool sub-component', () => {
		const workflow: WorkflowJSON = {
			name: 't',
			nodes: [
				node({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', id: 'a' }),
				node({
					name: 'HTTP Tool',
					type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
					id: 'h',
					parameters: { url: "={{ $('Webhook').item.json.endpoint }}" },
				}),
				node({ name: 'Webhook', type: 'n8n-nodes-base.webhook', id: 'w' }),
			],
			connections: {
				'HTTP Tool': { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
			},
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;

		expect(detectToolRefs(workflow, 'Agent')).toEqual([
			{ sourceNodeName: 'Webhook', field: 'endpoint', toolNodeName: 'HTTP Tool' },
		]);
	});

	it('detects a named ref inside an ai_memory sub-component', () => {
		const workflow: WorkflowJSON = {
			name: 't',
			nodes: [
				node({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', id: 'a' }),
				node({
					name: 'Postgres Memory',
					type: '@n8n/n8n-nodes-langchain.memoryPostgres',
					id: 'm',
					parameters: { sessionIdExpression: "={{ $('Telegram Trigger').item.json.chat_id }}" },
				}),
				node({ name: 'Telegram Trigger', type: 'n8n-nodes-base.telegramTrigger', id: 't' }),
			],
			connections: {
				'Postgres Memory': { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			},
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;

		expect(detectToolRefs(workflow, 'Agent')).toEqual([
			{
				sourceNodeName: 'Telegram Trigger',
				field: 'chat_id',
				toolNodeName: 'Postgres Memory',
			},
		]);
	});

	it('emits one entry per unique (source, field, tool) triplet, deduped within a tool', () => {
		const workflow: WorkflowJSON = {
			name: 't',
			nodes: [
				node({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', id: 'a' }),
				node({
					name: 'Memory',
					type: '@n8n/n8n-nodes-langchain.memoryPostgres',
					id: 'm',
					parameters: {
						sessionIdExpression: "={{ $('Trigger').item.json.id }}",
						contextWindow: "Use {{ $('Trigger').item.json.id }} for context",
					},
				}),
				node({ name: 'Trigger', type: 'n8n-nodes-base.webhook', id: 't' }),
			],
			connections: {
				Memory: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			},
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;

		const result = detectToolRefs(workflow, 'Agent');
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			sourceNodeName: 'Trigger',
			field: 'id',
			toolNodeName: 'Memory',
		});
	});

	it('skips refs whose source node does not exist in the workflow', () => {
		const workflow: WorkflowJSON = {
			name: 't',
			nodes: [
				node({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', id: 'a' }),
				node({
					name: 'Memory',
					type: '@n8n/n8n-nodes-langchain.memoryPostgres',
					id: 'm',
					parameters: { sessionIdExpression: "={{ $('Ghost Node').item.json.id }}" },
				}),
			],
			connections: {
				Memory: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			},
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;

		expect(detectToolRefs(workflow, 'Agent')).toEqual([]);
	});

	it('skips refs to nodes downstream of the agent (those execute during eval)', () => {
		const workflow: WorkflowJSON = {
			name: 't',
			nodes: [
				node({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', id: 'a' }),
				node({ name: 'Downstream', type: 'n8n-nodes-base.set', id: 'd' }),
				node({
					name: 'Tool',
					type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
					id: 't',
					parameters: { url: "={{ $('Downstream').item.json.value }}" },
				}),
			],
			connections: {
				Agent: { main: [[{ node: 'Downstream', type: 'main', index: 0 }]] },
				Tool: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
			},
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;

		expect(detectToolRefs(workflow, 'Agent')).toEqual([]);
	});

	it('skips refs that point to the agent itself', () => {
		const workflow: WorkflowJSON = {
			name: 't',
			nodes: [
				node({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', id: 'a' }),
				node({
					name: 'Tool',
					type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
					id: 't',
					parameters: { url: "={{ $('Agent').item.json.output }}" },
				}),
			],
			connections: {
				Tool: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
			},
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;

		expect(detectToolRefs(workflow, 'Agent')).toEqual([]);
	});

	it('aggregates refs from multiple sub-components', () => {
		const workflow: WorkflowJSON = {
			name: 't',
			nodes: [
				node({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', id: 'a' }),
				node({
					name: 'Tool',
					type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
					id: 'h',
					parameters: { url: "={{ $('Webhook').item.json.url }}" },
				}),
				node({
					name: 'Memory',
					type: '@n8n/n8n-nodes-langchain.memoryPostgres',
					id: 'm',
					parameters: { sessionIdExpression: "={{ $('Webhook').item.json.session }}" },
				}),
				node({ name: 'Webhook', type: 'n8n-nodes-base.webhook', id: 'w' }),
			],
			connections: {
				Tool: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
				Memory: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			},
			pinData: {},
			settings: {},
		} as unknown as WorkflowJSON;

		const result = detectToolRefs(workflow, 'Agent');
		expect(result).toHaveLength(2);
		expect(result.map((r) => r.toolNodeName).sort()).toEqual(['Memory', 'Tool']);
		expect(result.every((r) => r.sourceNodeName === 'Webhook')).toBe(true);
	});

	it('throws if the agent node is not in the workflow', () => {
		expect(() => detectToolRefs(wf([]), 'Missing')).toThrow(/not found/i);
	});
});
