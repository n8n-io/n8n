import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { StructuredTool, Tool } from '@langchain/core/tools';
import { BufferWindowMemory } from 'langchain/memory';
import { z } from 'zod';

import {
	formatToOpenAIAssistantTool,
	formatToOpenAIFunction,
	formatToOpenAITool,
	getChatMessages,
} from '../helpers/utils';

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

describe('OpenAI tool formatting', () => {
	describe('formatToOpenAIFunction', () => {
		it('should format a StructuredTool to OpenAI function format', () => {
			const mockTool = {
				name: 'testTool',
				description: 'A test tool',
				schema: z.object({
					input: z.string().describe('Input parameter'),
					count: z.number().optional().describe('Optional count'),
				}),
			} as StructuredTool;

			const result = formatToOpenAIFunction(mockTool);

			expect(result).toEqual({
				name: 'testTool',
				description: 'A test tool',
				parameters: {
					$schema: 'http://json-schema.org/draft-07/schema#',
					type: 'object',
					properties: {
						input: {
							type: 'string',
							description: 'Input parameter',
						},
						count: {
							type: 'number',
							description: 'Optional count',
						},
					},
					required: ['input'],
					additionalProperties: false,
				},
			});
		});
	});

	describe('formatToOpenAITool', () => {
		it('should format a StructuredTool to OpenAI tool format', () => {
			const mockTool = {
				name: 'searchTool',
				description: 'Search for information',
				schema: z.object({
					query: z.string().describe('Search query'),
					limit: z.number().default(10).describe('Result limit'),
				}),
			} as StructuredTool;

			const result = formatToOpenAITool(mockTool);

			expect(result).toEqual({
				type: 'function',
				function: {
					name: 'searchTool',
					description: 'Search for information',
					parameters: {
						$schema: 'http://json-schema.org/draft-07/schema#',
						type: 'object',
						properties: {
							query: {
								type: 'string',
								description: 'Search query',
							},
							limit: {
								type: 'number',
								description: 'Result limit',
								default: 10,
							},
						},
						required: ['query'],
						additionalProperties: false,
					},
				},
			});
		});
	});

	describe('formatToOpenAIAssistantTool', () => {
		it('should format a StructuredTool to OpenAI Assistant tool format', () => {
			const mockStructuredTool = {
				name: 'calculatorTool',
				description: 'Perform calculations',
				schema: z.object({
					expression: z.string().describe('Mathematical expression'),
					precision: z.number().optional().describe('Decimal precision'),
				}),
			} as StructuredTool;

			const result = formatToOpenAIAssistantTool(mockStructuredTool);

			expect(result).toEqual({
				type: 'function',
				function: {
					name: 'calculatorTool',
					description: 'Perform calculations',
					parameters: {
						$schema: 'http://json-schema.org/draft-07/schema#',
						type: 'object',
						properties: {
							expression: {
								type: 'string',
								description: 'Mathematical expression',
							},
							precision: {
								type: 'number',
								description: 'Decimal precision',
							},
						},
						required: ['expression'],
						additionalProperties: false,
					},
				},
			});
		});

		it('should format a basic Tool (without schema) to OpenAI Assistant tool format', () => {
			const mockBasicTool = {
				name: 'basicTool',
				description: 'A basic tool without schema',
			} as Tool;

			const result = formatToOpenAIAssistantTool(mockBasicTool);

			expect(result).toEqual({
				type: 'function',
				function: {
					name: 'basicTool',
					description: 'A basic tool without schema',
					parameters: {
						type: 'object',
						properties: {},
					},
				},
			});
		});

		it('should handle StructuredTool with empty schema', () => {
			const mockTool = {
				name: 'emptyTool',
				description: 'Tool with empty schema',
				schema: undefined,
			} as any;

			const result = formatToOpenAIAssistantTool(mockTool);

			expect(result).toEqual({
				type: 'function',
				function: {
					name: 'emptyTool',
					description: 'Tool with empty schema',
					parameters: {
						type: 'object',
						properties: {},
					},
				},
			});
		});

		it('should handle Tool without schema property', () => {
			const mockTool = {
				name: 'noSchemaTool',
				description: 'Tool without schema property',
			} as Tool;

			const result = formatToOpenAIAssistantTool(mockTool);

			expect(result).toEqual({
				type: 'function',
				function: {
					name: 'noSchemaTool',
					description: 'Tool without schema property',
					parameters: {
						type: 'object',
						properties: {},
					},
				},
			});
		});
	});
});
