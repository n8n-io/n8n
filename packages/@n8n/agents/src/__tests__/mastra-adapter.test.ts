/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
import { MastraAdapter } from '../runtime/mastra-adapter';
import type { BuiltTool, BuiltMemory } from '../types';

const mockGenerate = jest.fn();

jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn().mockImplementation((config: unknown) => ({
		__isMastraAgent: true,
		config,
		generate: mockGenerate,
		__setLogger: jest.fn(),
	})),
}));

describe('MastraAdapter', () => {
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

	it('should create a Mastra agent from n8n config', () => {
		const adapter = new MastraAdapter({
			name: 'test-agent',
			model: 'anthropic/claude-sonnet-4',
			instructions: 'You are helpful.',
		});

		expect(adapter).toBeDefined();

		// Verify the Agent constructor was called with correct params
		const { Agent: MockAgent } = require('@mastra/core/agent');
		expect(MockAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'test-agent',
				name: 'test-agent',
				model: 'anthropic/claude-sonnet-4',
				instructions: 'You are helpful.',
			}),
		);
	});

	it('should create with tools as a record map', () => {
		const mockTool: BuiltTool = {
			name: 'search',
			description: 'Search the web',
			_mastraTool: { __isTool: true },
		};

		new MastraAdapter({
			name: 'test-agent',
			model: 'anthropic/claude-sonnet-4',
			instructions: 'You are helpful.',
			tools: [mockTool],
		});

		const { Agent: MockAgent } = require('@mastra/core/agent');
		expect(MockAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				tools: { search: { __isTool: true } },
			}),
		);
	});

	it('should create with memory', () => {
		const mockMemory: BuiltMemory = {
			_mastraMemory: { __isMemory: true },
		};

		new MastraAdapter({
			name: 'test-agent',
			model: 'anthropic/claude-sonnet-4',
			instructions: 'You are helpful.',
			memory: mockMemory,
		});

		const { Agent: MockAgent } = require('@mastra/core/agent');
		expect(MockAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				memory: { __isMemory: true },
			}),
		);
	});

	it('should throw if model is missing', () => {
		expect(
			() =>
				new MastraAdapter({
					name: 'test-agent',
					model: '',
					instructions: 'You are helpful.',
				}),
		).toThrow('Agent "test-agent" requires a model');
	});

	it('should call generate and return normalized AgentResult', async () => {
		const adapter = new MastraAdapter({
			name: 'test-agent',
			model: 'anthropic/claude-sonnet-4',
			instructions: 'You are helpful.',
		});

		const result = await adapter.generate([
			{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
		]);

		expect(mockGenerate).toHaveBeenCalledWith(
			[{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
			{},
		);
		expect(result).toEqual({
			text: 'mock response',
			toolCalls: [],
			tokens: { input: 10, output: 5 },
			steps: 1,
		});
	});

	it('should pass memory options when threadId and resourceId are provided', async () => {
		const adapter = new MastraAdapter({
			name: 'test-agent',
			model: 'anthropic/claude-sonnet-4',
			instructions: 'You are helpful.',
		});

		await adapter.generate([{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }], {
			threadId: 'thread-1',
			resourceId: 'res-1',
		});

		expect(mockGenerate).toHaveBeenCalledWith(
			[{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
			{
				memory: { thread: 'thread-1', resource: 'res-1' },
			},
		);
	});

	it('should normalize tool calls from Mastra output', async () => {
		mockGenerate.mockResolvedValue({
			text: 'I found results',
			usage: { inputTokens: 20, outputTokens: 15 },
			steps: [{}, {}],
			toolCalls: [
				{
					type: 'tool-call',
					payload: {
						toolCallId: 'tc-1',
						toolName: 'search',
						args: { query: 'test' },
					},
				},
			],
			toolResults: [
				{
					type: 'tool-result',
					payload: {
						toolCallId: 'tc-1',
						toolName: 'search',
						result: { data: 'found' },
						args: { query: 'test' },
					},
				},
			],
		});

		const adapter = new MastraAdapter({
			name: 'test-agent',
			model: 'anthropic/claude-sonnet-4',
			instructions: 'You are helpful.',
		});

		const result = await adapter.generate([
			{ role: 'user', content: [{ type: 'text', text: 'Search for test' }] },
		]);

		expect(result.toolCalls).toEqual([
			{
				tool: 'search',
				input: { query: 'test' },
				output: { data: 'found' },
			},
		]);
		expect(result.tokens).toEqual({ input: 20, output: 15 });
		expect(result.steps).toBe(2);
	});
});
