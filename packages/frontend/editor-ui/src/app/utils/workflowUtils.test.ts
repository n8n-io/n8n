import {
	removeWorkflowExecutionData,
	convertWorkflowTagsToIds,
	sortNodesByExecutionOrder,
} from './workflowUtils';
import type { IWorkflowDb } from '@/Interface';
import type { INodeIssues } from 'n8n-workflow';

describe('workflowUtils', () => {
	describe('convertWorkflowTagsToIds', () => {
		it('should return empty array for undefined tags', () => {
			expect(convertWorkflowTagsToIds(undefined)).toEqual([]);
		});

		it('should return empty array for empty array', () => {
			expect(convertWorkflowTagsToIds([])).toEqual([]);
		});

		it('should return the same array if tags are already string IDs', () => {
			const stringTags = ['tag1', 'tag2', 'tag3'];
			expect(convertWorkflowTagsToIds(stringTags)).toEqual(stringTags);
		});

		it('should convert ITag objects to string IDs', () => {
			const objectTags = [
				{ id: 'tag1', name: 'Tag 1' },
				{ id: 'tag2', name: 'Tag 2' },
				{ id: 'tag3', name: 'Tag 3' },
			];
			expect(convertWorkflowTagsToIds(objectTags)).toEqual(['tag1', 'tag2', 'tag3']);
		});
	});

	describe('removeWorkflowExecutionData', () => {
		it('should return undefined if workflow is undefined', () => {
			expect(removeWorkflowExecutionData(undefined)).toBeUndefined();
		});

		it('should remove execution-related data from nodes and workflow-level pinData', () => {
			const mockWorkflow: IWorkflowDb = {
				id: 'test-workflow',
				name: 'Test Workflow',
				active: false,
				activeVersionId: null,
				isArchived: false,
				createdAt: '2023-01-01T00:00:00Z',
				updatedAt: '2023-01-01T00:00:00Z',
				nodes: [
					{
						id: 'node1',
						name: 'Test Node',
						type: 'test-type',
						typeVersion: 1,
						position: [100, 100],
						parameters: {},
						// Execution-related data that should be removed
						issues: {} as INodeIssues,
						pinData: { someData: 'test' },
					},
					{
						id: 'node2',
						name: 'Clean Node',
						type: 'another-type',
						typeVersion: 1,
						position: [200, 200],
						parameters: {},
						// No execution data
					},
				],
				connections: {},
				// Workflow-level execution data that should be removed
				pinData: { node1: [{ json: { data: 'execution-result' } }] },
				versionId: '1.0',
			};

			const result = removeWorkflowExecutionData(mockWorkflow);

			expect(result).toBeDefined();
			expect(result!.nodes).toHaveLength(2);

			// First node should have execution data removed
			expect(result!.nodes[0]).toEqual({
				id: 'node1',
				name: 'Test Node',
				type: 'test-type',
				typeVersion: 1,
				position: [100, 100],
				parameters: {},
			});

			// Second node should remain unchanged (no execution data to remove)
			expect(result!.nodes[1]).toEqual({
				id: 'node2',
				name: 'Clean Node',
				type: 'another-type',
				typeVersion: 1,
				position: [200, 200],
				parameters: {},
			});

			// Workflow-level pinData should be removed
			expect(result!.pinData).toBeUndefined();

			// Workflow metadata should be preserved
			expect(result!.id).toBe('test-workflow');
			expect(result!.name).toBe('Test Workflow');
			expect(result!.connections).toEqual({});
		});

		it('should preserve all other node properties', () => {
			const mockWorkflow: IWorkflowDb = {
				id: 'test-workflow',
				name: 'Test Workflow',
				active: false,
				activeVersionId: null,
				isArchived: false,
				createdAt: '2023-01-01T00:00:00Z',
				updatedAt: '2023-01-01T00:00:00Z',
				nodes: [
					{
						id: 'node1',
						name: 'Complex Node',
						type: 'complex-type',
						typeVersion: 2,
						position: [150, 250],
						parameters: { param1: 'value1', param2: { nested: true } },
						color: '#ff0000',
						notes: 'Some notes',
						disabled: true,
						// Execution data to be removed
						issues: {} as INodeIssues,
						pinData: { result: [{ json: { test: 'data' } }] },
					},
				],
				connections: {},
				versionId: '2.0',
			};

			const result = removeWorkflowExecutionData(mockWorkflow);

			expect(result!.nodes[0]).toEqual({
				id: 'node1',
				name: 'Complex Node',
				type: 'complex-type',
				typeVersion: 2,
				position: [150, 250],
				parameters: { param1: 'value1', param2: { nested: true } },
				color: '#ff0000',
				notes: 'Some notes',
				disabled: true,
			});
		});
	});

	describe('sortNodesByExecutionOrder', () => {
		const makeNode = (name: string, position: [number, number], isTrigger = false) => ({
			node: { name, position },
			isTrigger,
		});

		it('should return empty array for empty input', () => {
			expect(sortNodesByExecutionOrder([], {})).toEqual([]);
		});

		it('should return empty array when there are no triggers', () => {
			const nodeA = makeNode('A', [200, 0]);
			const nodeB = makeNode('B', [100, 0]);

			expect(sortNodesByExecutionOrder([nodeA, nodeB], {})).toEqual([]);
		});

		it('should sort a linear chain by execution order', () => {
			const trigger = makeNode('Trigger', [0, 0], true);
			const nodeA = makeNode('A', [100, 0]);
			const nodeB = makeNode('B', [200, 0]);

			const connections = {
				Trigger: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
				A: { main: [[{ node: 'B', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeB, nodeA, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'A', 'B']);
		});

		it('should drop orphaned nodes not connected to any trigger', () => {
			const trigger = makeNode('Trigger', [0, 0], true);
			const connected = makeNode('Connected', [100, 0]);
			const orphaned = makeNode('Orphaned', [50, 0]);

			const connections = {
				Trigger: { main: [[{ node: 'Connected', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([orphaned, connected, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'Connected']);
		});

		it('should group nodes by trigger, processing triggers by X position', () => {
			const triggerA = makeNode('TriggerA', [200, 0], true);
			const triggerB = makeNode('TriggerB', [0, 0], true);
			const nodeA = makeNode('A', [300, 0]);
			const nodeB = makeNode('B', [100, 0]);

			const connections = {
				TriggerA: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
				TriggerB: { main: [[{ node: 'B', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeA, triggerA, nodeB, triggerB], connections);

			expect(result.map((n) => n.node.name)).toEqual(['TriggerB', 'B', 'TriggerA', 'A']);
		});

		it('should handle cycles gracefully', () => {
			const trigger = makeNode('Trigger', [0, 0], true);
			const nodeA = makeNode('A', [100, 0]);
			const nodeB = makeNode('B', [200, 0]);

			const connections = {
				Trigger: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
				A: { main: [[{ node: 'B', type: 'main' as const, index: 0 }]] },
				B: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeB, nodeA, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'A', 'B']);
		});

		it('should traverse through intermediate nodes not in the input list', () => {
			const trigger = makeNode('Trigger', [0, 0], true);
			const nodeC = makeNode('C', [300, 0]);

			const connections = {
				Trigger: { main: [[{ node: 'IntermediateNode', type: 'main' as const, index: 0 }]] },
				IntermediateNode: { main: [[{ node: 'C', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeC, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'C']);
		});

		it('should follow depth-first order, completing each branch before the next', () => {
			const trigger = makeNode('Trigger', [0, 0], true);
			const nodeA = makeNode('A', [100, 0]);
			const nodeB = makeNode('B', [200, 0]);
			const nodeC = makeNode('C', [100, 100]);
			const nodeD = makeNode('D', [200, 100]);

			const connections = {
				Trigger: {
					main: [
						[
							{ node: 'A', type: 'main' as const, index: 0 },
							{ node: 'C', type: 'main' as const, index: 0 },
						],
					],
				},
				A: { main: [[{ node: 'B', type: 'main' as const, index: 0 }]] },
				C: { main: [[{ node: 'D', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeD, nodeC, nodeB, nodeA, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'A', 'B', 'C', 'D']);
		});

		it('should not duplicate nodes reachable from multiple triggers', () => {
			const triggerA = makeNode('TriggerA', [0, 0], true);
			const triggerB = makeNode('TriggerB', [100, 100], true);
			const shared = makeNode('Shared', [200, 50]);

			const connections = {
				TriggerA: { main: [[{ node: 'Shared', type: 'main' as const, index: 0 }]] },
				TriggerB: { main: [[{ node: 'Shared', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([shared, triggerB, triggerA], connections);

			expect(result.map((n) => n.node.name)).toEqual(['TriggerA', 'Shared', 'TriggerB']);
		});

		it('should discover AI sub-nodes connected via non-main inputs', () => {
			const trigger = makeNode('MCPServer', [0, 0], true);
			const tool1 = makeNode('Tool1', [100, 100]);
			const tool2 = makeNode('Tool2', [100, 200]);

			// Tools connect TO the MCP Server (tool is source, MCP Server is destination)
			const connectionsBySource = {
				Tool1: { ai_tool: [[{ node: 'MCPServer', type: 'ai_tool' as const, index: 0 }]] },
				Tool2: { ai_tool: [[{ node: 'MCPServer', type: 'ai_tool' as const, index: 0 }]] },
			};

			// Inverted: MCP Server has incoming ai_tool connections from tools
			const connectionsByDestination = {
				MCPServer: {
					ai_tool: [
						[
							{ node: 'Tool1', type: 'ai_tool' as const, index: 0 },
							{ node: 'Tool2', type: 'ai_tool' as const, index: 0 },
						],
					],
				},
			};

			const result = sortNodesByExecutionOrder(
				[tool2, tool1, trigger],
				connectionsBySource,
				connectionsByDestination,
			);

			expect(result.map((n) => n.node.name)).toEqual(['Tool1', 'Tool2', 'MCPServer']);
		});

		it('should discover AI sub-nodes alongside main downstream nodes', () => {
			const trigger = makeNode('Agent', [0, 0], true);
			const tool = makeNode('Tool', [100, 100]);
			const downstream = makeNode('Downstream', [200, 0]);

			const connectionsBySource = {
				Agent: { main: [[{ node: 'Downstream', type: 'main' as const, index: 0 }]] },
				Tool: { ai_tool: [[{ node: 'Agent', type: 'ai_tool' as const, index: 0 }]] },
			};

			const connectionsByDestination = {
				Agent: {
					ai_tool: [[{ node: 'Tool', type: 'ai_tool' as const, index: 0 }]],
				},
			};

			const result = sortNodesByExecutionOrder(
				[downstream, tool, trigger],
				connectionsBySource,
				connectionsByDestination,
			);

			expect(result.map((n) => n.node.name)).toEqual(['Tool', 'Agent', 'Downstream']);
		});

		it('should place AI sub-nodes before their parent agent when agent is mid-chain', () => {
			// Trigger → Agent → Downstream, with LLM and Tool connected to Agent via AI inputs
			const trigger = makeNode('Start', [240, 400], true);
			const llm = makeNode('GPT Model', [704, 624]);
			const tool = makeNode('Google Search', [832, 624]);
			const agent = makeNode('Research Agent', [688, 400]);
			const downstream = makeNode('Send Report Email', [2096, 400]);

			const connectionsBySource = {
				Start: { main: [[{ node: 'Research Agent', type: 'main' as const, index: 0 }]] },
				'Research Agent': {
					main: [[{ node: 'Send Report Email', type: 'main' as const, index: 0 }]],
				},
				'GPT Model': {
					ai_languageModel: [
						[{ node: 'Research Agent', type: 'ai_languageModel' as const, index: 0 }],
					],
				},
				'Google Search': {
					ai_tool: [[{ node: 'Research Agent', type: 'ai_tool' as const, index: 0 }]],
				},
			};

			const connectionsByDestination = {
				'Research Agent': {
					main: [[{ node: 'Start', type: 'main' as const, index: 0 }]],
					ai_languageModel: [[{ node: 'GPT Model', type: 'ai_languageModel' as const, index: 0 }]],
					ai_tool: [[{ node: 'Google Search', type: 'ai_tool' as const, index: 0 }]],
				},
				'Send Report Email': {
					main: [[{ node: 'Research Agent', type: 'main' as const, index: 0 }]],
				},
			};

			const result = sortNodesByExecutionOrder(
				[downstream, llm, tool, agent, trigger],
				connectionsBySource,
				connectionsByDestination,
			);

			// Sub-nodes (GPT Model, Google Search) should appear before their parent (Research Agent)
			// and the parent should appear before downstream nodes (Send Report Email)
			expect(result.map((n) => n.node.name)).toEqual([
				'Start',
				'GPT Model',
				'Google Search',
				'Research Agent',
				'Send Report Email',
			]);
		});

		it('should handle shared sub-nodes connected to multiple agents in a chain', () => {
			// Start → Research Agent → Fact-Checking Agent → Report Writing Agent → HTML Agent → Send Email
			// GPT Model is shared across ALL four agents (ai_languageModel)
			// Google Search is shared across Research Agent and Fact-Checking Agent (ai_tool)
			// Only Start, Research Agent, GPT Model, Google Search, Send Email are in the nodes input
			const start = makeNode('Start', [240, 304], true);
			const researchAgent = makeNode('Research Agent', [464, 304]);
			const gptModel = makeNode('GPT-4.1 Mini Model', [480, 528]);
			const googleSearch = makeNode('Google Search', [608, 528]);
			const sendEmail = makeNode('Send Report Email', [1872, 304]);

			const connectionsBySource = {
				Start: { main: [[{ node: 'Research Agent', type: 'main' as const, index: 0 }]] },
				'Research Agent': {
					main: [[{ node: 'Fact-Checking Agent', type: 'main' as const, index: 0 }]],
				},
				'GPT-4.1 Mini Model': {
					ai_languageModel: [
						[
							{ node: 'Research Agent', type: 'ai_languageModel' as const, index: 0 },
							{ node: 'Fact-Checking Agent', type: 'ai_languageModel' as const, index: 0 },
							{ node: 'Report Writing Agent', type: 'ai_languageModel' as const, index: 0 },
							{ node: 'HTML Formatting Agent', type: 'ai_languageModel' as const, index: 0 },
						],
					],
				},
				'Google Search': {
					ai_tool: [
						[
							{ node: 'Research Agent', type: 'ai_tool' as const, index: 0 },
							{ node: 'Fact-Checking Agent', type: 'ai_tool' as const, index: 0 },
						],
					],
				},
				'Fact-Checking Agent': {
					main: [[{ node: 'Report Writing Agent', type: 'main' as const, index: 0 }]],
				},
				'Report Writing Agent': {
					main: [[{ node: 'HTML Formatting Agent', type: 'main' as const, index: 0 }]],
				},
				'HTML Formatting Agent': {
					main: [[{ node: 'Send Report Email', type: 'main' as const, index: 0 }]],
				},
			};

			const connectionsByDestination = {
				'Research Agent': {
					main: [[{ node: 'Start', type: 'main' as const, index: 0 }]],
					ai_languageModel: [
						[{ node: 'GPT-4.1 Mini Model', type: 'ai_languageModel' as const, index: 0 }],
					],
					ai_tool: [[{ node: 'Google Search', type: 'ai_tool' as const, index: 0 }]],
				},
				'Fact-Checking Agent': {
					main: [[{ node: 'Research Agent', type: 'main' as const, index: 0 }]],
					ai_languageModel: [
						[{ node: 'GPT-4.1 Mini Model', type: 'ai_languageModel' as const, index: 0 }],
					],
					ai_tool: [[{ node: 'Google Search', type: 'ai_tool' as const, index: 0 }]],
				},
				'Report Writing Agent': {
					main: [[{ node: 'Fact-Checking Agent', type: 'main' as const, index: 0 }]],
					ai_languageModel: [
						[{ node: 'GPT-4.1 Mini Model', type: 'ai_languageModel' as const, index: 0 }],
					],
				},
				'HTML Formatting Agent': {
					main: [[{ node: 'Report Writing Agent', type: 'main' as const, index: 0 }]],
					ai_languageModel: [
						[{ node: 'GPT-4.1 Mini Model', type: 'ai_languageModel' as const, index: 0 }],
					],
				},
				'Send Report Email': {
					main: [[{ node: 'HTML Formatting Agent', type: 'main' as const, index: 0 }]],
				},
			};

			const result = sortNodesByExecutionOrder(
				[sendEmail, gptModel, googleSearch, researchAgent, start],
				connectionsBySource,
				connectionsByDestination,
			);

			// Sub-nodes should appear before their first parent agent (Research Agent),
			// and the entire main chain should maintain execution order.
			// Research Agent must come before Send Report Email.
			expect(result.map((n) => n.node.name)).toEqual([
				'Start',
				'GPT-4.1 Mini Model',
				'Google Search',
				'Research Agent',
				'Send Report Email',
			]);
		});

		it('should process loop-body output before done output for loop nodes', () => {
			// Trigger → Loop Over Items → (done) → Wait
			//                            → (loop) → HTTP Request → (back to Loop)
			const trigger = makeNode('Trigger', [0, 0], true);
			const loop = makeNode('Loop', [100, 0]);
			const wait = makeNode('Wait', [200, -100]);
			const httpRequest = makeNode('HTTP Request', [200, 100]);

			const connections = {
				Trigger: { main: [[{ node: 'Loop', type: 'main' as const, index: 0 }]] },
				Loop: {
					main: [
						// output 0 = "done"
						[{ node: 'Wait', type: 'main' as const, index: 0 }],
						// output 1 = "loop"
						[{ node: 'HTTP Request', type: 'main' as const, index: 0 }],
					],
				},
				'HTTP Request': { main: [[{ node: 'Loop', type: 'main' as const, index: 0 }]] },
			};

			const nodeTypes = { Loop: 'n8n-nodes-base.splitInBatches' };

			const result = sortNodesByExecutionOrder(
				[wait, httpRequest, loop, trigger],
				connections,
				{},
				nodeTypes,
			);

			// Loop body (HTTP Request) should come before done branch (Wait)
			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'Loop', 'HTTP Request', 'Wait']);
		});

		it('should handle loop node with multiple nodes in the loop body', () => {
			// Trigger → Loop → (done) → Done Node
			//                → (loop) → Step1 → Step2 → (back to Loop)
			const trigger = makeNode('Trigger', [0, 0], true);
			const loop = makeNode('Loop', [100, 0]);
			const doneNode = makeNode('Done', [200, -100]);
			const step1 = makeNode('Step1', [200, 100]);
			const step2 = makeNode('Step2', [300, 100]);

			const connections = {
				Trigger: { main: [[{ node: 'Loop', type: 'main' as const, index: 0 }]] },
				Loop: {
					main: [
						[{ node: 'Done', type: 'main' as const, index: 0 }],
						[{ node: 'Step1', type: 'main' as const, index: 0 }],
					],
				},
				Step1: { main: [[{ node: 'Step2', type: 'main' as const, index: 0 }]] },
				Step2: { main: [[{ node: 'Loop', type: 'main' as const, index: 0 }]] },
			};

			const nodeTypes = { Loop: 'n8n-nodes-base.splitInBatches' };

			const result = sortNodesByExecutionOrder(
				[doneNode, step2, step1, loop, trigger],
				connections,
				{},
				nodeTypes,
			);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'Loop', 'Step1', 'Step2', 'Done']);
		});

		it('should not follow main connections from connectionsByDestinationNode', () => {
			const trigger = makeNode('Trigger', [0, 0], true);
			const nodeA = makeNode('A', [100, 0]);

			const connectionsBySource = {
				Trigger: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
			};

			// main connections in destination map should be ignored
			// (they are already followed via connectionsBySourceNode)
			const connectionsByDestination = {
				A: { main: [[{ node: 'Trigger', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder(
				[nodeA, trigger],
				connectionsBySource,
				connectionsByDestination,
			);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'A']);
		});
	});
});
