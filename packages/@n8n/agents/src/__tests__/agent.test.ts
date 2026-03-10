/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
import { Agent } from '../agent';
import type { BuiltTool, BuiltMemory, BuiltGuardrail, BuiltEval } from '../types';

/** Exposes protected build() for testing. */
class TestableAgent extends Agent<any> {
	override build() {
		return super.build();
	}
}

/** Call build() on a TestableAgent after fluent chaining (which widens the type to Agent). */
function buildAgent(agent: Agent<any>): ReturnType<TestableAgent['build']> {
	return (agent as TestableAgent).build();
}

const mockGenerate = jest.fn();

jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn().mockImplementation((config: unknown) => ({
		__isMastraAgent: true,
		config,
		generate: mockGenerate,
		__setLogger: jest.fn(),
	})),
}));

jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn().mockImplementation((config: { id: string }) => ({
		__isMastraTool: true,
		id: config.id,
	})),
}));

describe('Agent', () => {
	const mockTool: BuiltTool = {
		name: 'search',
		description: 'Search the web',
		_mastraTool: { __isTool: true },
	};

	const mockMemory: BuiltMemory = {
		_mastraMemory: { __isMemory: true },
	};

	const mockGuardrail: BuiltGuardrail = {
		name: 'pii-filter',
		guardType: 'pii',
		strategy: 'redact',
		_config: { detectionTypes: ['email'] },
	};

	const mockEval: BuiltEval = {
		name: 'test-eval',
		description: 'A test eval',
		_run: async () => await Promise.resolve({ pass: true, reasoning: 'ok' }),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockGenerate.mockResolvedValue({
			text: 'mock response',
			usage: { inputTokens: 10, outputTokens: 5 },
			steps: [{ toolCalls: [] }],
			toolCalls: [],
			toolResults: [],
		});
	});

	describe('build()', () => {
		it('should build with minimum config (model + instructions)', () => {
			const agent = buildAgent(
				new TestableAgent('assistant')
					.model('anthropic/claude-sonnet-4')
					.instructions('You are helpful.'),
			);

			expect(agent.name).toBe('assistant');
		});

		it('should build with tools', () => {
			const agent = buildAgent(
				new TestableAgent('assistant')
					.model('anthropic/claude-sonnet-4')
					.instructions('You are helpful.')
					.tool(mockTool),
			);

			expect(agent.name).toBe('assistant');

			const { Agent: MockAgent } = require('@mastra/core/agent');
			expect(MockAgent).toHaveBeenCalledWith(
				expect.objectContaining({
					tools: { search: { __isTool: true } },
				}),
			);
		});

		it('should build with memory', () => {
			const agent = buildAgent(
				new TestableAgent('assistant')
					.model('anthropic/claude-sonnet-4')
					.instructions('You are helpful.')
					.memory(mockMemory),
			);

			expect(agent.name).toBe('assistant');

			const { Agent: MockAgent } = require('@mastra/core/agent');
			expect(MockAgent).toHaveBeenCalledWith(
				expect.objectContaining({
					memory: { __isMemory: true },
				}),
			);
		});

		it('should build with guardrails and evals', () => {
			const agent = buildAgent(
				new TestableAgent('assistant')
					.model('anthropic/claude-sonnet-4')
					.instructions('You are helpful.')
					.inputGuardrail(mockGuardrail)
					.outputGuardrail(mockGuardrail)
					.eval(mockEval),
			);

			expect(agent.name).toBe('assistant');
		});

		it('should throw if model is missing', () => {
			expect(() =>
				buildAgent(new TestableAgent('assistant').instructions('You are helpful.')),
			).toThrow('Agent "assistant" requires a model');
		});

		it('should throw if instructions are missing', () => {
			expect(() =>
				buildAgent(new TestableAgent('assistant').model('anthropic/claude-sonnet-4')),
			).toThrow('Agent "assistant" requires instructions');
		});
	});

	describe('run()', () => {
		it('should return a Run in running state', () => {
			const agent = new Agent('assistant')
				.model('anthropic/claude-sonnet-4')
				.instructions('You are helpful.');

			const run = agent.run('Hello!');

			expect(run.state).toBe('running');
		});

		it('should resolve with AgentResult', async () => {
			const agent = new Agent('assistant')
				.model('anthropic/claude-sonnet-4')
				.instructions('You are helpful.');

			const run = agent.run('Hello!');
			const result = await run.result;

			expect(result.messages).toBeDefined();
			expect(result.usage?.promptTokens).toBe(10);
			expect(result.usage?.completionTokens).toBe(5);
			expect(result.steps).toBe(1);
		});

		it('should pass options to generate', async () => {
			const agent = new Agent('assistant')
				.model('anthropic/claude-sonnet-4')
				.instructions('You are helpful.');

			const run = agent.run('Hello!', {
				threadId: 'thread-1',
				resourceId: 'res-1',
			});
			await run.result;

			expect(mockGenerate).toHaveBeenCalledWith(
				[{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }],
				{ memory: { thread: 'thread-1', resource: 'res-1' } },
			);
		});

		it('should transition to completed state after result resolves', async () => {
			const agent = new Agent('assistant')
				.model('anthropic/claude-sonnet-4')
				.instructions('You are helpful.');

			const run = agent.run('Hello!');
			await run.result;

			expect(run.state).toBe('completed');
		});

		it('should transition to failed state when generate rejects', async () => {
			mockGenerate.mockRejectedValue(new Error('API error'));

			const agent = new Agent('assistant')
				.model('anthropic/claude-sonnet-4')
				.instructions('You are helpful.');

			const run = agent.run('Hello!');
			await expect(run.result).rejects.toThrow('API error');

			expect(run.state).toBe('failed');
		});
	});

	describe('stream()', () => {
		it('should return a Run (delegates to generate for now)', async () => {
			const agent = new Agent('assistant')
				.model('anthropic/claude-sonnet-4')
				.instructions('You are helpful.');

			const run = agent.stream('Hello!');

			expect(run.state).toBe('running');

			const result = await run.result;
			expect(result.messages).toBeDefined();
		});
	});

	describe('asTool()', () => {
		it('should return a BuiltTool with correct name and description', () => {
			const agent = new Agent('assistant')
				.model('anthropic/claude-sonnet-4')
				.instructions('You are helpful.');

			const tool = agent.asTool('Ask the assistant a question');

			expect(tool.name).toBe('assistant');
			expect(tool.description).toBe('Ask the assistant a question');
			expect(tool._mastraTool).toBeDefined();
		});
	});

	describe('fluent API chaining', () => {
		it('should support full chain with all builder methods', () => {
			const agent = buildAgent(
				new TestableAgent('full-agent')
					.model('openai/gpt-4o')
					.instructions('You do everything.')
					.tool(mockTool)
					.memory(mockMemory)
					.inputGuardrail(mockGuardrail)
					.outputGuardrail(mockGuardrail)
					.eval(mockEval),
			);

			expect(agent.name).toBe('full-agent');
		});

		it('should support multiple tools', () => {
			const secondTool: BuiltTool = {
				name: 'calculator',
				description: 'Do math',
				_mastraTool: { __isTool: true, id: 'calculator' },
			};

			const agent = buildAgent(
				new TestableAgent('multi-tool')
					.model('anthropic/claude-sonnet-4')
					.instructions('You are helpful.')
					.tool(mockTool)
					.tool(secondTool),
			);

			expect(agent.name).toBe('multi-tool');

			const { Agent: MockAgent } = require('@mastra/core/agent');
			expect(MockAgent).toHaveBeenCalledWith(
				expect.objectContaining({
					tools: {
						search: { __isTool: true },
						calculator: { __isTool: true, id: 'calculator' },
					},
				}),
			);
		});
	});
});
