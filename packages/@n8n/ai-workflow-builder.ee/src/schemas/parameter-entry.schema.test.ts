import { ParameterEntrySchema, ParameterValueType } from './parameter-entry.schema';

describe('parameter-entry.schema', () => {
	describe('ParameterValueType', () => {
		it('should accept string type', () => {
			expect(ParameterValueType.parse('string')).toBe('string');
		});

		it('should accept number type', () => {
			expect(ParameterValueType.parse('number')).toBe('number');
		});

		it('should accept boolean type', () => {
			expect(ParameterValueType.parse('boolean')).toBe('boolean');
		});

		it('should reject invalid type', () => {
			expect(() => ParameterValueType.parse('json')).toThrow();
			expect(() => ParameterValueType.parse('object')).toThrow();
			expect(() => ParameterValueType.parse('array')).toThrow();
			expect(() => ParameterValueType.parse('')).toThrow();
		});
	});

	describe('ParameterEntrySchema', () => {
		describe('valid entries', () => {
			it('should accept valid string entry', () => {
				const entry = { path: 'method', type: 'string', value: 'POST' };
				const result = ParameterEntrySchema.parse(entry);
				expect(result).toEqual(entry);
			});

			it('should accept valid number entry', () => {
				const entry = { path: 'timeout', type: 'number', value: '30' };
				const result = ParameterEntrySchema.parse(entry);
				expect(result).toEqual(entry);
			});

			it('should accept valid boolean entry', () => {
				const entry = { path: 'enabled', type: 'boolean', value: 'true' };
				const result = ParameterEntrySchema.parse(entry);
				expect(result).toEqual(entry);
			});

			it('should accept nested path', () => {
				const entry = { path: 'options.retry.maxRetries', type: 'number', value: '3' };
				const result = ParameterEntrySchema.parse(entry);
				expect(result).toEqual(entry);
			});

			it('should accept array index path', () => {
				const entry = { path: 'headers.0.name', type: 'string', value: 'Content-Type' };
				const result = ParameterEntrySchema.parse(entry);
				expect(result).toEqual(entry);
			});

			it('should accept expression value', () => {
				const entry = { path: 'url', type: 'string', value: '={{ $json.apiUrl }}' };
				const result = ParameterEntrySchema.parse(entry);
				expect(result).toEqual(entry);
			});

			it('should accept empty string value', () => {
				const entry = { path: 'url', type: 'string', value: '' };
				const result = ParameterEntrySchema.parse(entry);
				expect(result).toEqual(entry);
			});
		});

		describe('invalid entries', () => {
			it('should reject missing path', () => {
				expect(() => ParameterEntrySchema.parse({ type: 'string', value: 'test' })).toThrow();
			});

			it('should reject empty path', () => {
				expect(() =>
					ParameterEntrySchema.parse({ path: '', type: 'string', value: 'test' }),
				).toThrow();
			});

			it('should reject missing type', () => {
				expect(() => ParameterEntrySchema.parse({ path: 'method', value: 'POST' })).toThrow();
			});

			it('should reject invalid type enum value', () => {
				expect(() =>
					ParameterEntrySchema.parse({ path: 'data', type: 'json', value: '{}' }),
				).toThrow();
				expect(() =>
					ParameterEntrySchema.parse({ path: 'data', type: 'object', value: '{}' }),
				).toThrow();
			});

			it('should reject missing value', () => {
				expect(() => ParameterEntrySchema.parse({ path: 'method', type: 'string' })).toThrow();
			});

			it('should reject null values', () => {
				expect(() =>
					ParameterEntrySchema.parse({ path: null, type: 'string', value: 'test' }),
				).toThrow();
				expect(() =>
					ParameterEntrySchema.parse({ path: 'method', type: null, value: 'test' }),
				).toThrow();
				expect(() =>
					ParameterEntrySchema.parse({ path: 'method', type: 'string', value: null }),
				).toThrow();
			});

			it('should reject undefined values', () => {
				expect(() =>
					ParameterEntrySchema.parse({ path: undefined, type: 'string', value: 'test' }),
				).toThrow();
			});

			it('should reject non-string path', () => {
				expect(() =>
					ParameterEntrySchema.parse({ path: 123, type: 'string', value: 'test' }),
				).toThrow();
			});

			it('should reject non-string value', () => {
				expect(() =>
					ParameterEntrySchema.parse({ path: 'count', type: 'number', value: 123 }),
				).toThrow();
			});
		});

		describe('edge cases', () => {
			it('should accept single character path', () => {
				const entry = { path: 'x', type: 'string', value: 'test' };
				expect(ParameterEntrySchema.parse(entry)).toEqual(entry);
			});

			it('should accept path with underscores', () => {
				const entry = { path: 'my_field_name', type: 'string', value: 'test' };
				expect(ParameterEntrySchema.parse(entry)).toEqual(entry);
			});

			it('should accept path with special characters in value', () => {
				const entry = { path: 'query', type: 'string', value: 'name="test" AND active=true' };
				expect(ParameterEntrySchema.parse(entry)).toEqual(entry);
			});

			it('should accept multiline string value', () => {
				const entry = { path: 'code', type: 'string', value: 'line1\nline2\nline3' };
				expect(ParameterEntrySchema.parse(entry)).toEqual(entry);
			});

			it('should accept JSON-like string value', () => {
				const entry = { path: 'body', type: 'string', value: '{"key": "value"}' };
				expect(ParameterEntrySchema.parse(entry)).toEqual(entry);
			});
		});
	});
});
