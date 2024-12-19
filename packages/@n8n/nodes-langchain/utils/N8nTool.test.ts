import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { z } from 'zod';

import { N8nTool } from './N8nTool';

describe('N8nTool', () => {
	const func = jest.fn();
	const ctx = mock<ISupplyDataFunctions>();

	beforeEach(() => jest.clearAllMocks());

	describe('Test N8nTool wrapper as DynamicStructuredTool', () => {
		it('should wrap a tool', () => {
			const tool = new N8nTool(ctx, {
				name: 'Dummy Tool',
				description: 'A dummy tool for testing',
				func,
				schema: z.object({
					foo: z.string(),
				}),
			});

			expect(tool).toBeInstanceOf(DynamicStructuredTool);
		});
	});

	describe('Test N8nTool wrapper - DynamicTool fallback', () => {
		it('should convert the tool to a dynamic tool', () => {
			const tool = new N8nTool(ctx, {
				name: 'Dummy Tool',
				description: 'A dummy tool for testing',
				func,
				schema: z.object({
					foo: z.string(),
				}),
			});

			const dynamicTool = tool.asDynamicTool();

			expect(dynamicTool).toBeInstanceOf(DynamicTool);
		});

		it('should format fallback description correctly', () => {
			const tool = new N8nTool(ctx, {
				name: 'Dummy Tool',
				description: 'A dummy tool for testing',
				func,
				schema: z.object({
					foo: z.string(),
					bar: z.number().optional(),
					qwe: z.boolean().describe('Boolean description'),
				}),
			});

			const dynamicTool = tool.asDynamicTool();

			expect(dynamicTool.description).toContain(
				'foo: (description: , type: string, required: true)',
			);
			expect(dynamicTool.description).toContain(
				'bar: (description: , type: number, required: false)',
			);

			expect(dynamicTool.description).toContain(
				'qwe: (description: Boolean description, type: boolean, required: true)',
			);
		});

		it('should handle empty parameter list correctly', () => {
			const tool = new N8nTool(ctx, {
				name: 'Dummy Tool',
				description: 'A dummy tool for testing',
				func,
				schema: z.object({}),
			});

			const dynamicTool = tool.asDynamicTool();

			expect(dynamicTool.description).toEqual('A dummy tool for testing');
		});

		it('should parse correct parameters', async () => {
			const tool = new N8nTool(ctx, {
				name: 'Dummy Tool',
				description: 'A dummy tool for testing',
				func,
				schema: z.object({
					foo: z.string().describe('Foo description'),
					bar: z.number().optional(),
				}),
			});

			const dynamicTool = tool.asDynamicTool();

			const testParameters = { foo: 'some value' };

			await dynamicTool.func(JSON.stringify(testParameters));

			expect(func).toHaveBeenCalledWith(testParameters);
		});

		it('should recover when 1 parameter is passed directly', async () => {
			const tool = new N8nTool(ctx, {
				name: 'Dummy Tool',
				description: 'A dummy tool for testing',
				func,
				schema: z.object({
					foo: z.string().describe('Foo description'),
				}),
			});

			const dynamicTool = tool.asDynamicTool();

			const testParameter = 'some value';

			await dynamicTool.func(testParameter);

			expect(func).toHaveBeenCalledWith({ foo: testParameter });
		});

		it('should recover when JS object is passed instead of JSON', async () => {
			const tool = new N8nTool(ctx, {
				name: 'Dummy Tool',
				description: 'A dummy tool for testing',
				func,
				schema: z.object({
					foo: z.string().describe('Foo description'),
				}),
			});

			const dynamicTool = tool.asDynamicTool();

			await dynamicTool.func('{ foo: "some value" }');

			expect(func).toHaveBeenCalledWith({ foo: 'some value' });
		});
	});
});
