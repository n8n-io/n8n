import { z } from 'zod';

import { convertValueBySchema, convertObjectBySchema } from '../utils/convertToSchema';

describe('convertToSchema', () => {
	describe('convertValueBySchema', () => {
		it('should convert string to number when schema is ZodNumber', () => {
			const result = convertValueBySchema('42', z.number());
			expect(result).toBe(42);
		});

		it('should convert string to boolean when schema is ZodBoolean', () => {
			expect(convertValueBySchema('true', z.boolean())).toBe(true);
			expect(convertValueBySchema('false', z.boolean())).toBe(false);
			expect(convertValueBySchema('TRUE', z.boolean())).toBe(true);
			expect(convertValueBySchema('FALSE', z.boolean())).toBe(false);
		});

		it('should parse JSON string when schema is ZodObject', () => {
			const result = convertValueBySchema(
				'{"key": "value", "other_key": 1, "booleanValue": false }',
				z.object({}),
			);
			expect(result).toEqual({ key: 'value', other_key: 1, booleanValue: false });
		});

		it('should return original value if JSON parsing fails', () => {
			const result = convertValueBySchema('invalid json', z.object({}));
			expect(result).toEqual('invalid json');
		});

		it('should return original value for non-string inputs', () => {
			const input = { key: 'value' };
			const result = convertValueBySchema(input, z.object({}));
			expect(result).toEqual(input);
		});
	});

	describe('convertObjectBySchema', () => {
		it('should convert object values according to schema', () => {
			const schema = z.object({
				numberValue: z.number(),
				booleanValue: z.boolean(),
				object: z.object({}),
				unchanged: z.string(),
			});

			const input = {
				numberValue: '42',
				booleanValue: 'true',
				object: '{"nested": "value"}',
				unchanged: 'string value',
			};

			const result = convertObjectBySchema(input, schema);

			expect(result).toEqual({
				numberValue: 42,
				booleanValue: true,
				object: { nested: 'value' },
				unchanged: 'string value',
			});
		});

		it('should return original object if schema has no shape', () => {
			const input = { key: 'value' };
			const result = convertObjectBySchema(input, {});
			expect(result).toBe(input);
		});

		it('should return original object if input is null', () => {
			const result = convertObjectBySchema(null, z.object({}));
			expect(result).toBeNull();
		});

		it('should handle nested objects', () => {
			const schema = z.object({
				nested: z.object({
					numberValue: z.number(),
					booleanValue: z.boolean(),
				}),
			});

			const input = {
				nested: {
					numberValue: '42',
					booleanValue: 'true',
				},
			};

			const result = convertObjectBySchema(input, schema);

			expect(result).toEqual({
				nested: {
					numberValue: 42,
					booleanValue: true,
				},
			});
		});

		it('should preserve fields not in schema', () => {
			const schema = z.object({
				number: z.number(),
			});

			const input = {
				number: '42',
				extra: 'value',
			};

			const result = convertObjectBySchema(input, schema);

			expect(result).toEqual({
				number: 42,
				extra: 'value',
			});
		});
	});
});
