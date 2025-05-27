import type { StructuredTool, Tool } from 'langchain/tools';
import { z } from 'zod';

import { executeTool } from '../utils/executeTool';

describe('executeTool', () => {
	describe('with StructuredTool', () => {
		it('should execute a StructuredTool with schema conversion', async () => {
			const schema = z.object({
				input: z.string(),
				count: z.number().default(1),
			});
			const mockStructuredTool = {
				schema,
				invoke: jest.fn().mockResolvedValue({ result: 'processed input' }),
			} as any as StructuredTool;

			const query = { input: 'test input', count: 5 };
			const result = await executeTool(mockStructuredTool, query);

			expect(mockStructuredTool.invoke).toHaveBeenCalledWith({
				input: 'test input',
				count: 5,
			});
			expect(result).toEqual({
				json: { result: 'processed input' },
			});
		});

		it('should execute a StructuredTool with type conversion', async () => {
			const schema = z.object({
				input: z.string(),
				count: z.number(),
				enabled: z.boolean(),
			});
			const mockStructuredTool = {
				schema,
				invoke: jest.fn().mockResolvedValue({ result: 'converted' }),
			} as any as StructuredTool;

			const query = { input: 'test input', count: '10', enabled: 'true' };
			const result = await executeTool(mockStructuredTool, query);

			expect(mockStructuredTool.invoke).toHaveBeenCalledWith({
				input: 'test input',
				count: 10,
				enabled: true,
			});
			expect(result).toEqual({
				json: { result: 'converted' },
			});
		});

		it('should execute a StructuredTool with string query', async () => {
			const mockStructuredTool = {
				schema: z.string(),
				invoke: jest.fn().mockResolvedValue({ result: 'processed string' }),
			} as any as StructuredTool;

			const query = 'test string input';
			const result = await executeTool(mockStructuredTool, query);

			expect(mockStructuredTool.invoke).toHaveBeenCalledWith('test string input');
			expect(result).toEqual({
				json: { result: 'processed string' },
			});
		});

		it('should handle StructuredTool without schema', async () => {
			const mockStructuredTool = {
				invoke: jest.fn().mockResolvedValue({ result: 'no schema' }),
			} as any as StructuredTool;

			const query = { input: 'test' };
			const result = await executeTool(mockStructuredTool, query);

			expect(mockStructuredTool.invoke).toHaveBeenCalledWith({ input: 'test' });
			expect(result).toEqual({
				json: { result: 'no schema' },
			});
		});
	});

	describe('with basic Tool', () => {
		it('should execute a basic Tool without schema conversion', async () => {
			const mockTool = {
				invoke: jest.fn().mockResolvedValue({ result: 'basic tool result' }),
			} as any as Tool;

			const query = { input: 'raw input' };
			const result = await executeTool(mockTool, query);

			expect(mockTool.invoke).toHaveBeenCalledWith({ input: 'raw input' });
			expect(result).toEqual({
				json: { result: 'basic tool result' },
			});
		});

		it('should execute a basic Tool with string query', async () => {
			const mockTool = {
				invoke: jest.fn().mockResolvedValue('string result'),
			} as any as Tool;

			const query = 'string input';
			const result = await executeTool(mockTool, query);

			expect(mockTool.invoke).toHaveBeenCalledWith('string input');
			expect(result).toEqual({
				json: 'string result',
			});
		});
	});

	describe('edge cases', () => {
		it('should handle tool that returns null', async () => {
			const mockTool = {
				invoke: jest.fn().mockResolvedValue(null),
			} as any as Tool;

			const query = 'test';
			const result = await executeTool(mockTool, query);

			expect(result).toEqual({
				json: null,
			});
		});

		it('should handle tool that returns undefined', async () => {
			const mockTool = {
				invoke: jest.fn().mockResolvedValue(undefined),
			} as any as Tool;

			const query = 'test';
			const result = await executeTool(mockTool, query);

			expect(result).toEqual({
				json: undefined,
			});
		});

		it('should handle complex nested result objects', async () => {
			const complexResult = {
				data: {
					items: [1, 2, 3],
					metadata: { count: 3, hasMore: false },
				},
				status: 'success',
			};

			const mockTool = {
				invoke: jest.fn().mockResolvedValue(complexResult),
			} as any as Tool;

			const query = 'complex query';
			const result = await executeTool(mockTool, query);

			expect(result).toEqual({
				json: complexResult,
			});
		});
	});
});
