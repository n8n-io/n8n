import type { IBinaryData, INodeExecutionData } from 'n8n-workflow';
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
			{
				description: 'object with null or undefined values',
				input: { key: null, another: undefined } as unknown as INodeExecutionData,
				expected: [{ json: { key: null, another: undefined } }],
			},
			{
				description: 'array with mixed non-standard objects',
				input: [{ custom: 'value1' }, { another: 'value2' }] as unknown as INodeExecutionData[],
				expected: [{ json: { custom: 'value1' } }, { json: { another: 'value2' } }],
			},
			{
				description: 'empty object',
				input: {} as INodeExecutionData,
				expected: [{ json: {} }],
			},
			{
				description: 'array with primitive values',
				input: [1, 'string', true] as unknown as INodeExecutionData[],
				expected: [
					{ json: 1 },
					{ json: 'string' },
					{ json: true },
				] as unknown as INodeExecutionData[],
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
			{
				description: 'when mixing json and non-json objects with non-json properties',
				input: [
					{ json: { key1: 'value1' } },
					{ other: 'value', custom: 'prop' } as unknown as INodeExecutionData,
				],
			},
			{
				description: 'when mixing binary and non-binary objects',
				input: [
					{ json: {}, binary: { data: { data: 'binarydata' } as IBinaryData } },
					{ custom: 'value' } as unknown as INodeExecutionData,
				],
			},
		];
		test.each(errorTests)('$description', ({ input }) => {
			expect(() => normalizeItems(input)).toThrow(new ApplicationError('Inconsistent item format'));
		});
	});
});
