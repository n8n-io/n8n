import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { PlanOutput } from '../../../types/planning';
import type { ChatPayload } from '../../../workflow-builder-agent';
import { NodeTypeParser } from '../../utils/node-type-parser';
import { ChatSetupHandler, extractNodeNamesFromPlan } from '../chat-setup-handler';

function createMockTool(name: string): StructuredToolInterface {
	return { name } as unknown as StructuredToolInterface;
}

function createMockLlm() {
	const boundTools: Array<unknown[] | undefined> = [];
	const mockBoundLlm = {};

	const llm = {
		bindTools: jest.fn((tools: unknown[]) => {
			boundTools.push(tools);
			return mockBoundLlm;
		}),
	} as unknown as BaseChatModel;

	return { llm, boundTools, mockBoundLlm };
}

const mockHttpRequestNodeType: INodeTypeDescription = {
	name: 'n8n-nodes-base.httpRequest',
	displayName: 'HTTP Request',
	description: 'Makes HTTP requests',
	group: ['transform'],
	version: 4,
	defaults: { name: 'HTTP Request' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
};

const mockSlackNodeType: INodeTypeDescription = {
	name: 'n8n-nodes-base.slack',
	displayName: 'Slack',
	description: 'Send messages to Slack',
	group: ['output'],
	version: 2,
	defaults: { name: 'Slack' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
};

const mockSetNodeType: INodeTypeDescription = {
	name: 'n8n-nodes-base.set',
	displayName: 'Edit Fields',
	description: 'Modify, add, or remove item fields',
	group: ['transform'],
	version: 3,
	defaults: { name: 'Edit Fields' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
};

const mockPlan: PlanOutput = {
	summary: 'Fetch weather and send Slack alert',
	trigger: 'Runs every morning at 7 AM',
	steps: [
		{ description: 'Fetch weather forecast', suggestedNodes: ['n8n-nodes-base.httpRequest'] },
		{ description: 'Send Slack notification', suggestedNodes: ['n8n-nodes-base.slack'] },
	],
};

describe('ChatSetupHandler', () => {
	describe('tool exclusion with approved plan', () => {
		const tools = [
			createMockTool('search_nodes'),
			createMockTool('get_node_types'),
			createMockTool('get_suggested_nodes'),
			createMockTool('think'),
		];

		it('excludes get_suggested_nodes tool when planOutput is present', async () => {
			const { llm } = createMockLlm();

			const handler = new ChatSetupHandler({
				llm,
				tools,
				enableTextEditorConfig: false,
				parseAndValidate: jest.fn(),
				getErrorContext: jest.fn(),
			});

			const payload: ChatPayload = {
				id: 'test-1',
				message: 'Build the workflow',
				planOutput: mockPlan,
			};

			await handler.execute({ payload });

			const firstCallArgs = (llm.bindTools as jest.Mock).mock.calls[0] as [
				Array<{ name?: string }>,
			];
			const toolNames = firstCallArgs[0]
				.filter((t): t is { name: string } => 'name' in t)
				.map((t) => t.name);

			expect(toolNames).not.toContain('get_suggested_nodes');
		});

		it('includes get_suggested_nodes tool when planOutput is absent', async () => {
			const { llm } = createMockLlm();

			const handler = new ChatSetupHandler({
				llm,
				tools,
				enableTextEditorConfig: false,
				parseAndValidate: jest.fn(),
				getErrorContext: jest.fn(),
			});

			const payload: ChatPayload = {
				id: 'test-2',
				message: 'Build a weather workflow',
			};

			await handler.execute({ payload });

			const firstCallArgs = (llm.bindTools as jest.Mock).mock.calls[0] as [
				Array<{ name?: string }>,
			];
			const toolNames = firstCallArgs[0]
				.filter((t): t is { name: string } => 'name' in t)
				.map((t) => t.name);

			expect(toolNames).toContain('get_suggested_nodes');
		});

		it('keeps other tools when planOutput is present', async () => {
			const { llm } = createMockLlm();

			const handler = new ChatSetupHandler({
				llm,
				tools,
				enableTextEditorConfig: false,
				parseAndValidate: jest.fn(),
				getErrorContext: jest.fn(),
			});

			const payload: ChatPayload = {
				id: 'test-1',
				message: 'Build the workflow',
				planOutput: mockPlan,
			};

			await handler.execute({ payload });

			const firstCallArgs = (llm.bindTools as jest.Mock).mock.calls[0] as [
				Array<{ name?: string }>,
			];
			const toolNames = firstCallArgs[0]
				.filter((t): t is { name: string } => 'name' in t)
				.map((t) => t.name);

			expect(toolNames).toContain('search_nodes');
			expect(toolNames).toContain('get_node_types');
			expect(toolNames).toContain('think');
		});
	});

	describe('pre-fetch search results via direct lookup', () => {
		it('uses nodeTypeParser to look up each suggestedNode', async () => {
			const { llm } = createMockLlm();
			const nodeTypeParser = new NodeTypeParser([mockHttpRequestNodeType, mockSlackNodeType]);
			const getNodeTypeSpy = jest.spyOn(nodeTypeParser, 'getNodeType');

			const tools = [
				createMockTool('search_nodes'),
				createMockTool('get_node_types'),
				createMockTool('think'),
			];

			const handler = new ChatSetupHandler({
				llm,
				tools,
				enableTextEditorConfig: false,
				parseAndValidate: jest.fn(),
				getErrorContext: jest.fn(),
				nodeTypeParser,
			});

			const payload: ChatPayload = {
				id: 'test-prefetch-1',
				message: 'Build the workflow',
				planOutput: mockPlan,
			};

			await handler.execute({ payload });

			// formatNodeResult calls getNodeType multiple times per node (for hints, discriminators, etc.)
			// Verify that both node types were looked up
			const calledNodeIds = new Set(getNodeTypeSpy.mock.calls.map((call) => call[0]));
			expect(calledNodeIds).toContain('n8n-nodes-base.httpRequest');
			expect(calledNodeIds).toContain('n8n-nodes-base.slack');
		});

		it('does NOT look up nodes when planOutput is absent', async () => {
			const { llm } = createMockLlm();
			const nodeTypeParser = new NodeTypeParser([mockHttpRequestNodeType, mockSlackNodeType]);
			const getNodeTypeSpy = jest.spyOn(nodeTypeParser, 'getNodeType');

			const tools = [
				createMockTool('search_nodes'),
				createMockTool('get_node_types'),
				createMockTool('think'),
			];

			const handler = new ChatSetupHandler({
				llm,
				tools,
				enableTextEditorConfig: false,
				parseAndValidate: jest.fn(),
				getErrorContext: jest.fn(),
				nodeTypeParser,
			});

			const payload: ChatPayload = {
				id: 'test-prefetch-2',
				message: 'Build a weather workflow',
			};

			await handler.execute({ payload });

			expect(getNodeTypeSpy).not.toHaveBeenCalled();
		});

		it('does NOT look up nodes when plan has no suggestedNodes', async () => {
			const { llm } = createMockLlm();
			const nodeTypeParser = new NodeTypeParser([mockHttpRequestNodeType]);
			const getNodeTypeSpy = jest.spyOn(nodeTypeParser, 'getNodeType');

			const tools = [
				createMockTool('search_nodes'),
				createMockTool('get_node_types'),
				createMockTool('think'),
			];

			const handler = new ChatSetupHandler({
				llm,
				tools,
				enableTextEditorConfig: false,
				parseAndValidate: jest.fn(),
				getErrorContext: jest.fn(),
				nodeTypeParser,
			});

			const planWithoutNodes: PlanOutput = {
				summary: 'Simple workflow',
				trigger: 'Manual',
				steps: [{ description: 'Do something' }, { description: 'Do something else' }],
			};

			const payload: ChatPayload = {
				id: 'test-prefetch-3',
				message: 'Build the workflow',
				planOutput: planWithoutNodes,
			};

			await handler.execute({ payload });

			expect(getNodeTypeSpy).not.toHaveBeenCalled();
		});

		it('deduplicates suggestedNodes across steps', async () => {
			const { llm } = createMockLlm();
			const nodeTypeParser = new NodeTypeParser([
				mockHttpRequestNodeType,
				mockSlackNodeType,
				mockSetNodeType,
			]);
			const getNodeTypeSpy = jest.spyOn(nodeTypeParser, 'getNodeType');

			const tools = [
				createMockTool('search_nodes'),
				createMockTool('get_node_types'),
				createMockTool('think'),
			];

			const handler = new ChatSetupHandler({
				llm,
				tools,
				enableTextEditorConfig: false,
				parseAndValidate: jest.fn(),
				getErrorContext: jest.fn(),
				nodeTypeParser,
			});

			const planWithDuplicates: PlanOutput = {
				summary: 'Workflow with duplicates',
				trigger: 'Manual',
				steps: [
					{
						description: 'Step 1',
						suggestedNodes: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.set'],
					},
					{
						description: 'Step 2',
						suggestedNodes: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.slack'],
					},
				],
			};

			const payload: ChatPayload = {
				id: 'test-prefetch-4',
				message: 'Build the workflow',
				planOutput: planWithDuplicates,
			};

			await handler.execute({ payload });

			// Verify all three unique nodes were looked up (getNodeType is called
			// multiple times per node internally by formatNodeResult helpers)
			const calledNodeIds = new Set(getNodeTypeSpy.mock.calls.map((call) => call[0]));
			expect(calledNodeIds).toContain('n8n-nodes-base.httpRequest');
			expect(calledNodeIds).toContain('n8n-nodes-base.set');
			expect(calledNodeIds).toContain('n8n-nodes-base.slack');
			// httpRequest appears in both steps but extractNodeNamesFromPlan deduplicates
			expect(calledNodeIds.size).toBe(3);
		});

		it('gracefully skips unknown nodes', async () => {
			const { llm } = createMockLlm();
			// Only httpRequest exists, slack does not
			const nodeTypeParser = new NodeTypeParser([mockHttpRequestNodeType]);

			const tools = [
				createMockTool('search_nodes'),
				createMockTool('get_node_types'),
				createMockTool('think'),
			];

			const handler = new ChatSetupHandler({
				llm,
				tools,
				enableTextEditorConfig: false,
				parseAndValidate: jest.fn(),
				getErrorContext: jest.fn(),
				nodeTypeParser,
			});

			const payload: ChatPayload = {
				id: 'test-prefetch-5',
				message: 'Build the workflow',
				planOutput: mockPlan,
			};

			// Should not throw
			await expect(handler.execute({ payload })).resolves.toBeDefined();
		});
	});

	describe('extractNodeNamesFromPlan', () => {
		it('returns full type names (no prefix stripping)', () => {
			const plan: PlanOutput = {
				summary: 'Test',
				trigger: 'Manual',
				steps: [
					{
						description: 'Step 1',
						suggestedNodes: [
							'n8n-nodes-base.httpRequest',
							'@n8n/n8n-nodes-langchain.agent',
							'n8n-nodes-base.slack',
						],
					},
				],
			};

			const names = extractNodeNamesFromPlan(plan);

			expect(names).toEqual([
				'n8n-nodes-base.httpRequest',
				'@n8n/n8n-nodes-langchain.agent',
				'n8n-nodes-base.slack',
			]);
		});

		it('returns empty array when no suggestedNodes exist', () => {
			const plan: PlanOutput = {
				summary: 'Test',
				trigger: 'Manual',
				steps: [{ description: 'Step 1' }],
			};

			expect(extractNodeNamesFromPlan(plan)).toEqual([]);
		});

		it('deduplicates node names across steps', () => {
			const plan: PlanOutput = {
				summary: 'Test',
				trigger: 'Manual',
				steps: [
					{ description: 'Step 1', suggestedNodes: ['n8n-nodes-base.httpRequest'] },
					{ description: 'Step 2', suggestedNodes: ['n8n-nodes-base.httpRequest'] },
				],
			};

			expect(extractNodeNamesFromPlan(plan)).toEqual(['n8n-nodes-base.httpRequest']);
		});
	});
});
