import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { Tool } from '@langchain/core/tools';
import { BufferWindowMemory } from 'langchain/memory';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
	formatToOpenAIFunction,
	formatToOpenAITool,
	formatToOpenAIAssistantTool,
	formatToOpenAIResponsesTool,
	getChatMessages,
} from '../helpers/utils';

jest.mock('zod-to-json-schema', () => ({
	zodToJsonSchema: jest.fn(),
}));
const mockZodToJsonSchema = jest.mocked(zodToJsonSchema);

describe('OpenAI message history', () => {
	it('should only get a limited number of messages', async () => {
		const memory = new BufferWindowMemory({
			returnMessages: true,
			k: 2,
		});
		expect(await getChatMessages(memory)).toEqual([]);

		await memory.saveContext(
			[new HumanMessage({ content: 'human 1' })],
			[new AIMessage({ content: 'ai 1' })],
		);
		// `k` means turns, but `getChatMessages` returns messages, so a Human and an AI message.
		expect((await getChatMessages(memory)).length).toEqual(2);

		await memory.saveContext(
			[new HumanMessage({ content: 'human 2' })],
			[new AIMessage({ content: 'ai 2' })],
		);
		expect((await getChatMessages(memory)).length).toEqual(4);
		expect((await getChatMessages(memory)).map((msg) => msg.content)).toEqual([
			'human 1',
			'ai 1',
			'human 2',
			'ai 2',
		]);

		// We expect this to be trimmed...
		await memory.saveContext(
			[new HumanMessage({ content: 'human 3' })],
			[new AIMessage({ content: 'ai 3' })],
		);
		expect((await getChatMessages(memory)).length).toEqual(4);
		expect((await getChatMessages(memory)).map((msg) => msg.content)).toEqual([
			'human 2',
			'ai 2',
			'human 3',
			'ai 3',
		]);
	});
});

describe('OpenAI formatting functions', () => {
	const createMockTool = (name: string, description: string, schema: z.ZodSchema): Tool =>
		({
			name,
			description,
			schema,
			func: jest.fn(),
			call: jest.fn(),
			returnDirect: false,
			verboseParsingErrors: false,
			lc_namespace: ['test'],
			lc_serializable: true,
		}) as unknown as Tool;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('formatToOpenAIFunction', () => {
		it('should format a tool to OpenAI function format', () => {
			const mockSchema = { type: 'object', properties: { name: { type: 'string' } } };
			mockZodToJsonSchema.mockReturnValue(mockSchema);

			const tool = createMockTool('test-tool', 'A test tool', z.object({ name: z.string() }));

			const result = formatToOpenAIFunction(tool);

			expect(result).toEqual({
				name: 'test-tool',
				description: 'A test tool',
				parameters: mockSchema,
			});
			expect(mockZodToJsonSchema).toHaveBeenCalledWith(tool.schema);
		});

		it('should handle tool with empty description', () => {
			const mockSchema = { type: 'object' };
			mockZodToJsonSchema.mockReturnValue(mockSchema);

			const tool = createMockTool('test-tool', '', z.object({}));

			const result = formatToOpenAIFunction(tool);

			expect(result).toEqual({
				name: 'test-tool',
				description: '',
				parameters: mockSchema,
			});
		});
	});

	describe('formatToOpenAITool', () => {
		it('should format a tool to OpenAI tool format', () => {
			const mockSchema = { type: 'object', properties: { value: { type: 'number' } } };
			mockZodToJsonSchema.mockReturnValue(mockSchema);

			const tool = createMockTool(
				'calculator',
				'A calculator tool',
				z.object({ value: z.number() }),
			);

			const result = formatToOpenAITool(tool);

			expect(result).toEqual({
				type: 'function',
				function: {
					name: 'calculator',
					description: 'A calculator tool',
					parameters: mockSchema,
				},
			});
			expect(mockZodToJsonSchema).toHaveBeenCalledWith(tool.schema);
		});

		it('should handle complex schema', () => {
			const mockSchema = {
				type: 'object',
				properties: {
					query: { type: 'string' },
					limit: { type: 'number' },
					options: { type: 'object' },
				},
				required: ['query'],
			};
			mockZodToJsonSchema.mockReturnValue(mockSchema);

			const tool = createMockTool(
				'search-tool',
				'Search functionality',
				z.object({
					query: z.string(),
					limit: z.number().optional(),
					options: z.object({}).optional(),
				}),
			);

			const result = formatToOpenAITool(tool);

			expect(result).toEqual({
				type: 'function',
				function: {
					name: 'search-tool',
					description: 'Search functionality',
					parameters: mockSchema,
				},
			});
		});
	});

	describe('formatToOpenAIAssistantTool', () => {
		it('should format a tool to OpenAI assistant tool format', () => {
			const mockSchema = { type: 'object', properties: { message: { type: 'string' } } };
			mockZodToJsonSchema.mockReturnValue(mockSchema);

			const tool = createMockTool(
				'message-tool',
				'Send a message',
				z.object({ message: z.string() }),
			);

			const result = formatToOpenAIAssistantTool(tool);

			expect(result).toEqual({
				type: 'function',
				function: {
					name: 'message-tool',
					description: 'Send a message',
					parameters: mockSchema,
				},
			});
			expect(mockZodToJsonSchema).toHaveBeenCalledWith(tool.schema);
		});

		it('should handle tool with no required fields', () => {
			const mockSchema = { type: 'object', properties: {} };
			mockZodToJsonSchema.mockReturnValue(mockSchema);

			const tool = createMockTool('simple-tool', 'A simple tool', z.object({}));

			const result = formatToOpenAIAssistantTool(tool);

			expect(result).toEqual({
				type: 'function',
				function: {
					name: 'simple-tool',
					description: 'A simple tool',
					parameters: mockSchema,
				},
			});
		});
	});

	describe('formatToOpenAIResponsesTool', () => {
		it('should format a tool to OpenAI responses tool format with strict mode', () => {
			const mockSchema = {
				type: 'object',
				properties: { input: { type: 'string' } },
				required: ['input'],
			};
			mockZodToJsonSchema.mockReturnValue(mockSchema);

			const tool = createMockTool('input-tool', 'Process input', z.object({ input: z.string() }));

			const result = formatToOpenAIResponsesTool(tool);

			expect(result).toEqual({
				type: 'function',
				name: 'input-tool',
				parameters: mockSchema,
				strict: true,
				description: 'Process input',
			});
			expect(mockZodToJsonSchema).toHaveBeenCalledWith(tool.schema);
		});

		it('should format a tool with non-strict mode when not all properties are required', () => {
			const mockSchema = {
				type: 'object',
				properties: {
					required: { type: 'string' },
					optional: { type: 'string' },
				},
				required: ['required'],
			};
			mockZodToJsonSchema.mockReturnValue(mockSchema);

			const tool = createMockTool(
				'mixed-tool',
				'Tool with required and optional fields',
				z.object({
					required: z.string(),
					optional: z.string().optional(),
				}),
			);

			const result = formatToOpenAIResponsesTool(tool);

			expect(result).toEqual({
				type: 'function',
				name: 'mixed-tool',
				parameters: mockSchema,
				strict: false,
				description: 'Tool with required and optional fields',
			});
		});

		it('should handle schema without required field', () => {
			const mockSchema = {
				type: 'object',
				properties: { field: { type: 'string' } },
			};
			mockZodToJsonSchema.mockReturnValue(mockSchema);

			const tool = createMockTool(
				'no-required-tool',
				'Tool with no required fields',
				z.object({ field: z.string().optional() }),
			);

			const result = formatToOpenAIResponsesTool(tool);

			expect(result).toEqual({
				type: 'function',
				name: 'no-required-tool',
				parameters: mockSchema,
				strict: false,
				description: 'Tool with no required fields',
			});
		});
	});
});
