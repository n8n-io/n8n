import type { INodeExecutionData } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

import { normalizeItems } from '../normalize-items';

describe('normalizeItems', () => {
	describe('should handle', () => {
		const successTests: Array<{
			description: string;
			input: INodeExecutionData | INodeExecutionData[];
			expected: INodeExecutionData[];
		}> = [
			{
				description: 'single object without json key',
				input: { key: 'value' } as unknown as INodeExecutionData,
				expected: [{ json: { key: 'value' } }],
			},
			{
				description: 'array of objects without json key',
				input: [{ key1: 'value1' }, { key2: 'value2' }] as unknown as INodeExecutionData[],
				expected: [{ json: { key1: 'value1' } }, { json: { key2: 'value2' } }],
			},
			{
				description: 'single object with json key',
				input: { json: { key: 'value' } } as INodeExecutionData,
				expected: [{ json: { key: 'value' } }],
			},
			{
				description: 'array of objects with json key',
				input: [{ json: { key1: 'value1' } }, { json: { key2: 'value2' } }] as INodeExecutionData[],
				expected: [{ json: { key1: 'value1' } }, { json: { key2: 'value2' } }],
			},
			{
				description: 'array of objects with binary data',
				input: [
					{ json: {}, binary: { data: { data: 'binary1', mimeType: 'mime1' } } },
					{ json: {}, binary: { data: { data: 'binary2', mimeType: 'mime2' } } },
				],
				expected: [
					{ json: {}, binary: { data: { data: 'binary1', mimeType: 'mime1' } } },
					{ json: {}, binary: { data: { data: 'binary2', mimeType: 'mime2' } } },
				],
			},
		];
		test.each(successTests)('$description', ({ input, expected }) => {
			const result = normalizeItems(input);
			expect(result).toEqual(expected);
		});
	});

	describe('should throw error', () => {
		const errorTests: Array<{
			description: string;
			input: INodeExecutionData[];
		}> = [
			{
				description: 'for inconsistent items with some having json key',
				input: [{ json: { key1: 'value1' } }, { key2: 'value2' } as unknown as INodeExecutionData],
			},
			{
				description: 'for inconsistent items with some having binary key',
				input: [
					{ json: {}, binary: { data: { data: 'binary1', mimeType: 'mime1' } } },
					{ key: 'value' } as unknown as INodeExecutionData,
				],
			},
		];
		test.each(errorTests)('$description', ({ input }) => {
			expect(() => normalizeItems(input)).toThrow(new ApplicationError('Inconsistent item format'));
		});
	});
});
