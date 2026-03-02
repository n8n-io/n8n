import type { ChatPayload } from '../../workflow-builder-agent';
import { CodeWorkflowBuilder, createCodeWorkflowBuilder } from '../code-workflow-builder';
import type { CodeWorkflowBuilderConfig } from '../code-workflow-builder';

// Create a mock LLM that returns valid planning response
const createMockLLM = () => {
	const mockResponse = {
		content:
			'<final_plan>## Overview\nTest plan.\n\n## Nodes\n- Test\n\n## Flow\nA → B\n\n## Key Points\nNone</final_plan>',
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

describe('CodeWorkflowBuilder', () => {
	describe('constructor', () => {
		it('should initialize with required config', () => {
			const config: CodeWorkflowBuilderConfig = {
				llm: createMockLLM() as unknown as CodeWorkflowBuilderConfig['llm'],
				nodeTypes: mockNodeTypes as unknown as CodeWorkflowBuilderConfig['nodeTypes'],
			};

			const builder = new CodeWorkflowBuilder(config);
			expect(builder).toBeInstanceOf(CodeWorkflowBuilder);
		});

		it('should accept optional logger', () => {
			const mockLogger = {
				debug: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
			};

			const config: CodeWorkflowBuilderConfig = {
				llm: createMockLLM() as unknown as CodeWorkflowBuilderConfig['llm'],
				nodeTypes: mockNodeTypes as unknown as CodeWorkflowBuilderConfig['nodeTypes'],
				logger: mockLogger as unknown as CodeWorkflowBuilderConfig['logger'],
			};

			const builder = new CodeWorkflowBuilder(config);
			expect(builder).toBeInstanceOf(CodeWorkflowBuilder);
		});

		it('should accept optional nodeDefinitionDirs', () => {
			const config: CodeWorkflowBuilderConfig = {
				llm: createMockLLM() as unknown as CodeWorkflowBuilderConfig['llm'],
				nodeTypes: mockNodeTypes as unknown as CodeWorkflowBuilderConfig['nodeTypes'],
				nodeDefinitionDirs: ['/path/to/generated/types'],
			};

			const builder = new CodeWorkflowBuilder(config);
			expect(builder).toBeInstanceOf(CodeWorkflowBuilder);
		});

		it('should accept optional onGenerationSuccess callback', () => {
			const onGenerationSuccess = jest.fn().mockResolvedValue(undefined);

			const config: CodeWorkflowBuilderConfig = {
				llm: createMockLLM() as unknown as CodeWorkflowBuilderConfig['llm'],
				nodeTypes: mockNodeTypes as unknown as CodeWorkflowBuilderConfig['nodeTypes'],
				onGenerationSuccess,
			};

			const builder = new CodeWorkflowBuilder(config);
			expect(builder).toBeInstanceOf(CodeWorkflowBuilder);
		});
	});

	describe('chat', () => {
		it('should yield stream output chunks', async () => {
			const config: CodeWorkflowBuilderConfig = {
				llm: createMockLLM() as unknown as CodeWorkflowBuilderConfig['llm'],
				nodeTypes: mockNodeTypes as unknown as CodeWorkflowBuilderConfig['nodeTypes'],
			};

			const builder = new CodeWorkflowBuilder(config);
			const payload: ChatPayload = {
				id: 'test-1',
				message: 'What is n8n?',
			};

			const generator = builder.chat(payload, 'user-123');

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			expect(chunks.length).toBeGreaterThan(0);
			expect(chunks[0]).toHaveProperty('messages');
		});

		it('should handle payload with workflowContext', async () => {
			const currentWorkflow = {
				id: 'test-workflow',
				name: 'Test Workflow',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1.1,
						position: [240, 300] as [number, number],
						parameters: {},
					},
				],
				connections: {},
			};

			const config: CodeWorkflowBuilderConfig = {
				llm: createMockLLM() as unknown as CodeWorkflowBuilderConfig['llm'],
				nodeTypes: mockNodeTypes as unknown as CodeWorkflowBuilderConfig['nodeTypes'],
			};

			const builder = new CodeWorkflowBuilder(config);
			const payload: ChatPayload = {
				id: 'test-2',
				message: 'Add a Slack node',
				workflowContext: {
					currentWorkflow,
				},
			};

			const generator = builder.chat(payload, 'user-123');

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			expect(chunks.length).toBeGreaterThan(0);
		});

		it('should respect abort signal', async () => {
			const controller = new AbortController();
			controller.abort();

			const config: CodeWorkflowBuilderConfig = {
				llm: createMockLLM() as unknown as CodeWorkflowBuilderConfig['llm'],
				nodeTypes: mockNodeTypes as unknown as CodeWorkflowBuilderConfig['nodeTypes'],
			};

			const builder = new CodeWorkflowBuilder(config);
			const payload: ChatPayload = {
				id: 'test-3',
				message: 'Create a workflow',
			};

			const generator = builder.chat(payload, 'user-123', controller.signal);

			const chunks = [];
			for await (const chunk of generator) {
				chunks.push(chunk);
			}

			// Should receive chunks even when aborted (including error message)
			expect(chunks.length).toBeGreaterThan(0);
		});

		it('should call logger.debug when logger is provided', async () => {
			const mockLogger = {
				debug: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
			};

			const config: CodeWorkflowBuilderConfig = {
				llm: createMockLLM() as unknown as CodeWorkflowBuilderConfig['llm'],
				nodeTypes: mockNodeTypes as unknown as CodeWorkflowBuilderConfig['nodeTypes'],
				logger: mockLogger as unknown as CodeWorkflowBuilderConfig['logger'],
			};

			const builder = new CodeWorkflowBuilder(config);
			const payload: ChatPayload = {
				id: 'test-4',
				message: 'Hello',
			};

			const generator = builder.chat(payload, 'user-456');

			// Consume the generator
			for await (const _ of generator) {
				// Just consume
			}

			expect(mockLogger.debug).toHaveBeenCalledWith('CodeWorkflowBuilder starting', {
				userId: 'user-456',
				messageLength: 5,
				hasSessionHandler: false,
			});
		});
	});
});

describe('createCodeWorkflowBuilder', () => {
	it('should create a CodeWorkflowBuilder with single LLM', () => {
		const mockLLM = createMockLLM();

		const builder = createCodeWorkflowBuilder(
			mockLLM as unknown as CodeWorkflowBuilderConfig['llm'],
			mockNodeTypes as unknown as CodeWorkflowBuilderConfig['nodeTypes'],
		);

		expect(builder).toBeInstanceOf(CodeWorkflowBuilder);
	});

	it('should accept optional logger', () => {
		const mockLLM = createMockLLM();
		const mockLogger = {
			debug: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
		};

		const builder = createCodeWorkflowBuilder(
			mockLLM as unknown as CodeWorkflowBuilderConfig['llm'],
			mockNodeTypes as unknown as CodeWorkflowBuilderConfig['nodeTypes'],
			{ logger: mockLogger as unknown as CodeWorkflowBuilderConfig['logger'] },
		);

		expect(builder).toBeInstanceOf(CodeWorkflowBuilder);
	});

	it('should accept optional nodeDefinitionDirs', () => {
		const mockLLM = createMockLLM();

		const builder = createCodeWorkflowBuilder(
			mockLLM as unknown as CodeWorkflowBuilderConfig['llm'],
			mockNodeTypes as unknown as CodeWorkflowBuilderConfig['nodeTypes'],
			{ nodeDefinitionDirs: ['/path/to/types'] },
		);

		expect(builder).toBeInstanceOf(CodeWorkflowBuilder);
	});
});
