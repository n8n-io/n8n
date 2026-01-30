import type { INodeTypeDescription } from 'n8n-workflow';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { PlanningAgent, type PlanningAgentConfig } from './planning-agent';
import { NodeTypeParser } from './utils/node-type-parser';

// Create mock node types
const mockNodeTypes: INodeTypeDescription[] = [
	{
		name: 'n8n-nodes-base.manualTrigger',
		displayName: 'Manual Trigger',
		description: 'Start workflow manually',
		version: 1.1,
		group: ['trigger'],
		defaults: { name: 'When clicking Test workflow' },
		inputs: [],
		outputs: ['main'],
		properties: [],
	},
	{
		name: 'n8n-nodes-base.gmail',
		displayName: 'Gmail',
		description: 'Send and receive emails with Gmail',
		version: 2.1,
		group: ['output'],
		defaults: { name: 'Gmail' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	},
] as INodeTypeDescription[];

// Create a mock LLM
const createMockLLM = (responseContent: string) => {
	const mockResponse = {
		content: responseContent,
		tool_calls: [],
		response_metadata: { usage: { input_tokens: 100, output_tokens: 50 } },
	};

	return {
		invoke: jest.fn().mockResolvedValue(mockResponse),
		bindTools: jest.fn().mockReturnValue({
			invoke: jest.fn().mockResolvedValue(mockResponse),
		}),
	};
};

describe('PlanningAgent', () => {
	describe('constructor', () => {
		it('should initialize with required config', () => {
			const nodeTypeParser = new NodeTypeParser(mockNodeTypes);

			const config: PlanningAgentConfig = {
				llm: createMockLLM('{}') as unknown as PlanningAgentConfig['llm'],
				nodeTypeParser,
			};

			const agent = new PlanningAgent(config);
			expect(agent).toBeInstanceOf(PlanningAgent);
		});

		it('should accept optional logger', () => {
			const nodeTypeParser = new NodeTypeParser(mockNodeTypes);

			const mockLogger = {
				debug: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
			};

			const config: PlanningAgentConfig = {
				llm: createMockLLM('{}') as unknown as PlanningAgentConfig['llm'],
				nodeTypeParser,
				logger: mockLogger as unknown as PlanningAgentConfig['logger'],
			};

			const agent = new PlanningAgent(config);
			expect(agent).toBeInstanceOf(PlanningAgent);
		});
	});

	describe('run', () => {
		it('should return "answer" type for direct questions with <final_answer> tag', async () => {
			const nodeTypeParser = new NodeTypeParser(mockNodeTypes);

			const answerResponse = '<final_answer>n8n is a workflow automation tool.</final_answer>';

			const config: PlanningAgentConfig = {
				llm: createMockLLM(answerResponse) as unknown as PlanningAgentConfig['llm'],
				nodeTypeParser,
			};

			const agent = new PlanningAgent(config);
			const generator = agent.run('What is n8n?');

			// Consume chunks and get final response
			let finalResponse;
			while (true) {
				const result = await generator.next();
				if (result.done) {
					finalResponse = result.value;
					break;
				}
			}

			expect(finalResponse).toBeDefined();
			expect(finalResponse?.type).toBe('answer');
			expect(finalResponse?.content).toBe('n8n is a workflow automation tool.');
		});

		it('should return "plan" type for workflow requests with <final_plan> tag', async () => {
			const nodeTypeParser = new NodeTypeParser(mockNodeTypes);

			const planResponse =
				'<final_plan>\n## Overview\nA test plan\n\n## Nodes\n- Node\n\n## Flow\nA → B\n\n## Key Points\nNone\n</final_plan>';

			const config: PlanningAgentConfig = {
				llm: createMockLLM(planResponse) as unknown as PlanningAgentConfig['llm'],
				nodeTypeParser,
			};

			const agent = new PlanningAgent(config);
			const generator = agent.run('Create a workflow to send emails');

			let finalResponse;
			while (true) {
				const result = await generator.next();
				if (result.done) {
					finalResponse = result.value;
					break;
				}
			}

			expect(finalResponse).toBeDefined();
			expect(finalResponse?.type).toBe('plan');
			expect(finalResponse?.content).toContain('Overview');
		});

		it('should handle <planning> tags interleaved with <final_plan>', async () => {
			const nodeTypeParser = new NodeTypeParser(mockNodeTypes);

			// Response with planning tags followed by final_plan tag
			const responseWithPlanning = `<planning>
Analyzing the request...
</planning>

<final_plan>
## Overview
A workflow with planning.

## Nodes
- **Node** (nodeType: \`test\`)

## Flow
A → B

## Key Points
None
</final_plan>`;

			const config: PlanningAgentConfig = {
				llm: createMockLLM(responseWithPlanning) as unknown as PlanningAgentConfig['llm'],
				nodeTypeParser,
			};

			const agent = new PlanningAgent(config);
			const generator = agent.run('Create a workflow');

			let finalResponse;
			while (true) {
				const result = await generator.next();
				if (result.done) {
					finalResponse = result.value;
					break;
				}
			}

			expect(finalResponse).toBeDefined();
			expect(finalResponse?.type).toBe('plan');
			expect(finalResponse?.content).toContain('Overview');
			expect(finalResponse?.content).not.toContain('<planning>');
		});

		it('should fall back to legacy JSON parsing for backwards compatibility', async () => {
			const nodeTypeParser = new NodeTypeParser(mockNodeTypes);

			// Legacy JSON format
			const legacyJsonResponse = JSON.stringify({
				type: 'answer',
				content: 'Legacy JSON response.',
			});

			const config: PlanningAgentConfig = {
				llm: createMockLLM(legacyJsonResponse) as unknown as PlanningAgentConfig['llm'],
				nodeTypeParser,
			};

			const agent = new PlanningAgent(config);
			const generator = agent.run('What is n8n?');

			let finalResponse;
			while (true) {
				const result = await generator.next();
				if (result.done) {
					finalResponse = result.value;
					break;
				}
			}

			expect(finalResponse).toBeDefined();
			expect(finalResponse?.type).toBe('answer');
			expect(finalResponse?.content).toBe('Legacy JSON response.');
		});

		it('should yield stream output chunks for tool calls', async () => {
			const nodeTypeParser = new NodeTypeParser(mockNodeTypes);

			// Mock LLM that makes a tool call first, then returns final response
			const toolCallResponse = {
				content: '',
				tool_calls: [
					{
						id: 'call-1',
						name: 'search_nodes',
						args: { query: 'email' },
					},
				],
				response_metadata: { usage: { input_tokens: 100, output_tokens: 50 } },
			};

			const finalResponse = {
				content: '<final_answer>Found email nodes.</final_answer>',
				tool_calls: [],
				response_metadata: { usage: { input_tokens: 100, output_tokens: 50 } },
			};

			const mockLLM = {
				invoke: jest.fn(),
				bindTools: jest.fn().mockReturnValue({
					invoke: jest
						.fn()
						.mockResolvedValueOnce(toolCallResponse)
						.mockResolvedValueOnce(finalResponse),
				}),
			};

			const config: PlanningAgentConfig = {
				llm: mockLLM as unknown as PlanningAgentConfig['llm'],
				nodeTypeParser,
			};

			const agent = new PlanningAgent(config);
			const generator = agent.run('Find email nodes');

			const chunks = [];
			while (true) {
				const result = await generator.next();
				if (result.done) {
					break;
				}
				chunks.push(result.value);
			}

			// Should have tool progress chunks
			const toolChunks = chunks.filter((c) => c.messages?.some((m) => m.type === 'tool'));
			expect(toolChunks.length).toBeGreaterThan(0);
		});

		it('should pass current workflow context', async () => {
			const nodeTypeParser = new NodeTypeParser(mockNodeTypes);

			const currentWorkflow: WorkflowJSON = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1.1,
						position: [240, 300],
						parameters: {},
					},
				],
				connections: {},
			};

			const planResponse = '<final_plan>## Modified plan</final_plan>';

			const config: PlanningAgentConfig = {
				llm: createMockLLM(planResponse) as unknown as PlanningAgentConfig['llm'],
				nodeTypeParser,
			};

			const agent = new PlanningAgent(config);
			const generator = agent.run('Add an email node', currentWorkflow);

			let finalResponse;
			while (true) {
				const result = await generator.next();
				if (result.done) {
					finalResponse = result.value;
					break;
				}
			}

			expect(finalResponse).toBeDefined();
		});

		it('should respect abort signal', async () => {
			const nodeTypeParser = new NodeTypeParser(mockNodeTypes);

			const controller = new AbortController();
			controller.abort();

			const config: PlanningAgentConfig = {
				llm: createMockLLM('{}') as unknown as PlanningAgentConfig['llm'],
				nodeTypeParser,
			};

			const agent = new PlanningAgent(config);
			const generator = agent.run('Test', undefined, controller.signal);

			await expect(async () => {
				while (true) {
					const result = await generator.next();
					if (result.done) break;
				}
			}).rejects.toThrow('Aborted');
		});

		it('should handle legacy JSON response wrapped in code block', async () => {
			const nodeTypeParser = new NodeTypeParser(mockNodeTypes);

			// Response with JSON in markdown code block (legacy format)
			const wrappedResponse = '```json\n{"type": "answer", "content": "Test answer"}\n```';

			const config: PlanningAgentConfig = {
				llm: createMockLLM(wrappedResponse) as unknown as PlanningAgentConfig['llm'],
				nodeTypeParser,
			};

			const agent = new PlanningAgent(config);
			const generator = agent.run('What is this?');

			let finalResponse;
			while (true) {
				const result = await generator.next();
				if (result.done) {
					finalResponse = result.value;
					break;
				}
			}

			expect(finalResponse?.type).toBe('answer');
			expect(finalResponse?.content).toBe('Test answer');
		});
	});
});
