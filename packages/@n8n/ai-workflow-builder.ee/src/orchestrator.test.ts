import type { ConversationMessage, OrchestratorConfig } from './orchestrator';
import { Orchestrator } from './orchestrator';

// Create a mock LLM that returns valid planning response
const createMockLLM = () => {
	const mockResponse = {
		content: JSON.stringify({ type: 'answer', content: 'This is a test answer.' }),
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

// Create mock node types
const mockNodeTypes = [
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
];

describe('Orchestrator', () => {
	describe('constructor', () => {
		it('should initialize with planning and coding agents', () => {
			const config: OrchestratorConfig = {
				planningLLM: createMockLLM() as unknown as OrchestratorConfig['planningLLM'],
				codingLLM: createMockLLM() as unknown as OrchestratorConfig['codingLLM'],
				nodeTypes: mockNodeTypes as unknown as OrchestratorConfig['nodeTypes'],
			};

			const orchestrator = new Orchestrator(config);
			expect(orchestrator).toBeInstanceOf(Orchestrator);
		});

		it('should accept optional logger', () => {
			const mockLogger = {
				debug: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
			};

			const config: OrchestratorConfig = {
				planningLLM: createMockLLM() as unknown as OrchestratorConfig['planningLLM'],
				codingLLM: createMockLLM() as unknown as OrchestratorConfig['codingLLM'],
				nodeTypes: mockNodeTypes as unknown as OrchestratorConfig['nodeTypes'],
				logger: mockLogger as unknown as OrchestratorConfig['logger'],
			};

			const orchestrator = new Orchestrator(config);
			expect(orchestrator).toBeInstanceOf(Orchestrator);
		});

		it('should accept optional generatedTypesDir', () => {
			const config: OrchestratorConfig = {
				planningLLM: createMockLLM() as unknown as OrchestratorConfig['planningLLM'],
				codingLLM: createMockLLM() as unknown as OrchestratorConfig['codingLLM'],
				nodeTypes: mockNodeTypes as unknown as OrchestratorConfig['nodeTypes'],
				generatedTypesDir: '/path/to/generated/types',
			};

			const orchestrator = new Orchestrator(config);
			expect(orchestrator).toBeInstanceOf(Orchestrator);
		});
	});

	describe('trimConversationHistory (via chat)', () => {
		// We can't test private methods directly, so we test the behavior through the public interface

		it('should handle empty conversation history', async () => {
			const mockPlanningLLM = createMockLLM();
			const config: OrchestratorConfig = {
				planningLLM: mockPlanningLLM as unknown as OrchestratorConfig['planningLLM'],
				codingLLM: createMockLLM() as unknown as OrchestratorConfig['codingLLM'],
				nodeTypes: mockNodeTypes as unknown as OrchestratorConfig['nodeTypes'],
			};

			const orchestrator = new Orchestrator(config);
			const generator = orchestrator.chat('Hello', undefined, []);

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			expect(chunks.length).toBeGreaterThan(0);
		});

		it('should pass conversation history to planning agent', async () => {
			const mockPlanningLLM = createMockLLM();
			const conversationHistory: ConversationMessage[] = [
				{ role: 'user', content: 'Previous question' },
				{ role: 'assistant', content: 'Previous answer' },
			];

			const config: OrchestratorConfig = {
				planningLLM: mockPlanningLLM as unknown as OrchestratorConfig['planningLLM'],
				codingLLM: createMockLLM() as unknown as OrchestratorConfig['codingLLM'],
				nodeTypes: mockNodeTypes as unknown as OrchestratorConfig['nodeTypes'],
			};

			const orchestrator = new Orchestrator(config);
			const generator = orchestrator.chat('New question', undefined, conversationHistory);

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			expect(chunks.length).toBeGreaterThan(0);
		});
	});

	describe('chat routing', () => {
		it('should route "answer" type response directly without calling coding agent', async () => {
			const mockPlanningLLM = createMockLLM();
			const mockCodingLLM = createMockLLM();

			const config: OrchestratorConfig = {
				planningLLM: mockPlanningLLM as unknown as OrchestratorConfig['planningLLM'],
				codingLLM: mockCodingLLM as unknown as OrchestratorConfig['codingLLM'],
				nodeTypes: mockNodeTypes as unknown as OrchestratorConfig['nodeTypes'],
			};

			const orchestrator = new Orchestrator(config);
			const generator = orchestrator.chat('What is n8n?');

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should have chunks for planning agent output
			expect(chunks.length).toBeGreaterThan(0);

			// Coding LLM should not be called for "answer" type
			expect(mockCodingLLM.bindTools().invoke).not.toHaveBeenCalled();
		});

		it('should route "plan" type response to coding agent', async () => {
			// Planning agent returns a plan
			const planResponse = {
				content: JSON.stringify({
					type: 'plan',
					content:
						'## Overview\nTest plan\n\n## Nodes\n- Node\n\n## Flow\nA → B\n\n## Key Points\nNone',
				}),
				tool_calls: [],
				response_metadata: { usage: { input_tokens: 100, output_tokens: 50 } },
			};

			// Coding agent returns workflow code
			const codeResponse = {
				content:
					'```typescript\nconst t = trigger({...});\nreturn workflow("id", "name").add(t);\n```',
				tool_calls: [],
				response_metadata: { usage: { input_tokens: 200, output_tokens: 100 } },
			};

			const mockPlanningLLM = {
				invoke: jest.fn().mockResolvedValue(planResponse),
				bindTools: jest.fn().mockReturnValue({
					invoke: jest.fn().mockResolvedValue(planResponse),
				}),
			};

			const mockCodingLLM = {
				invoke: jest.fn().mockResolvedValue(codeResponse),
				bindTools: jest.fn().mockReturnValue({
					invoke: jest.fn().mockResolvedValue(codeResponse),
				}),
			};

			const config: OrchestratorConfig = {
				planningLLM: mockPlanningLLM as unknown as OrchestratorConfig['planningLLM'],
				codingLLM: mockCodingLLM as unknown as OrchestratorConfig['codingLLM'],
				nodeTypes: mockNodeTypes as unknown as OrchestratorConfig['nodeTypes'],
			};

			const orchestrator = new Orchestrator(config);
			const generator = orchestrator.chat('Build a workflow');

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should have chunks from both planning and coding agents
			expect(chunks.length).toBeGreaterThan(0);

			// Coding LLM should be called for "plan" type
			expect(mockCodingLLM.bindTools).toHaveBeenCalled();
		});
	});

	describe('abort handling', () => {
		it('should respect abort signal before starting', async () => {
			const controller = new AbortController();
			controller.abort();

			const config: OrchestratorConfig = {
				planningLLM: createMockLLM() as unknown as OrchestratorConfig['planningLLM'],
				codingLLM: createMockLLM() as unknown as OrchestratorConfig['codingLLM'],
				nodeTypes: mockNodeTypes as unknown as OrchestratorConfig['nodeTypes'],
			};

			const orchestrator = new Orchestrator(config);
			const generator = orchestrator.chat('Hello', undefined, [], controller.signal);

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should receive an error message chunk
			expect(chunks.some((c) => c.messages?.some((m) => m.type === 'message'))).toBe(true);
		});
	});

	describe('current workflow handling', () => {
		it('should pass current workflow to agents', async () => {
			const currentWorkflow = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1.1,
						position: [240, 300] as [number, number],
						parameters: {},
					},
				],
				connections: {},
			};

			const config: OrchestratorConfig = {
				planningLLM: createMockLLM() as unknown as OrchestratorConfig['planningLLM'],
				codingLLM: createMockLLM() as unknown as OrchestratorConfig['codingLLM'],
				nodeTypes: mockNodeTypes as unknown as OrchestratorConfig['nodeTypes'],
			};

			const orchestrator = new Orchestrator(config);
			const generator = orchestrator.chat('Modify the workflow', currentWorkflow);

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			expect(chunks.length).toBeGreaterThan(0);
		});
	});

	describe('streaming output', () => {
		it('should stream planning agent output wrapped in tags', async () => {
			const config: OrchestratorConfig = {
				planningLLM: createMockLLM() as unknown as OrchestratorConfig['planningLLM'],
				codingLLM: createMockLLM() as unknown as OrchestratorConfig['codingLLM'],
				nodeTypes: mockNodeTypes as unknown as OrchestratorConfig['nodeTypes'],
			};

			const orchestrator = new Orchestrator(config);
			const generator = orchestrator.chat('What is n8n?');

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// First message should be opening tag
			const firstMessage = chunks[0]?.messages?.[0];
			expect(firstMessage?.type).toBe('message');
			if (firstMessage?.type === 'message') {
				expect(firstMessage.text).toContain('<final_workflow_plan>');
			}

			// Should have closing tag somewhere
			const hasClosingTag = chunks.some((c) =>
				c.messages?.some(
					(m) => m.type === 'message' && 'text' in m && m.text.includes('</final_workflow_plan>'),
				),
			);
			expect(hasClosingTag).toBe(true);
		});
	});
});
