import { describe, it, expect } from '@jest/globals';
import type { Schema } from 'n8n-workflow';

import { generateSchemaJSDoc, schemaToOutputSample } from './execution-schema-jsdoc';

describe('execution-schema-jsdoc', () => {
	describe('schemaToOutputSample - value redaction', () => {
		it('redacts string values to empty string', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ key: 'name', type: 'string', value: 'John Doe', path: '' }],
			};
			const result = schemaToOutputSample(schema);
			expect(result).toEqual({ name: '' });
		});

		it('redacts number values to 0', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ key: 'count', type: 'number', value: '42', path: '' }],
			};
			const result = schemaToOutputSample(schema);
			expect(result).toEqual({ count: 0 });
		});

		it('redacts boolean values to false', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ key: 'active', type: 'boolean', value: 'true', path: '' }],
			};
			const result = schemaToOutputSample(schema);
			expect(result).toEqual({ active: false });
		});

		it('preserves null values', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ key: 'data', type: 'null', value: 'null', path: '' }],
			};
			const result = schemaToOutputSample(schema);
			expect(result).toEqual({ data: null });
		});

		it('redacts nested object values', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [
					{
						key: 'user',
						type: 'object',
						path: '',
						value: [
							{ key: 'name', type: 'string', value: 'John', path: '' },
							{ key: 'age', type: 'number', value: '30', path: '' },
						],
					},
				],
			};
			const result = schemaToOutputSample(schema);
			expect(result).toEqual({ user: { name: '', age: 0 } });
		});

		it('redacts all values in object with multiple fields', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [
					{ type: 'string', key: 'id', value: 'usr_12345', path: 'id' },
					{ type: 'string', key: 'name', value: 'John Doe', path: 'name' },
					{ type: 'number', key: 'age', value: '30', path: 'age' },
					{ type: 'boolean', key: 'active', value: 'true', path: 'active' },
				],
			};

			const result = schemaToOutputSample(schema);

			expect(result).toEqual({
				id: '',
				name: '',
				age: 0,
				active: false,
			});
		});
	});

	describe('schemaToOutputSample - structure handling', () => {
		it('returns null for non-object schemas', () => {
			const stringSchema: Schema = {
				type: 'string',
				path: '',
				value: 'hello',
			};

			expect(schemaToOutputSample(stringSchema)).toBeNull();
		});

		it('handles nested object fields', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [
					{ type: 'string', key: 'id', value: '123', path: 'id' },
					{
						type: 'object',
						key: 'data',
						path: 'data',
						value: [{ type: 'boolean', key: 'approved', value: 'true', path: 'data.approved' }],
					},
				],
			};

			const result = schemaToOutputSample(schema);

			// Values are redacted: strings become '', booleans become false
			expect(result).toEqual({
				id: '',
				data: {
					approved: false,
				},
			});
		});

		it('handles array fields with empty default', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ type: 'array', key: 'items', value: [], path: 'items' }],
			};

			const result = schemaToOutputSample(schema);

			expect(result).toEqual({
				items: [],
			});
		});

		it('returns empty object for empty schema', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [],
			};

			const result = schemaToOutputSample(schema);

			expect(result).toEqual({});
		});

		it('handles null type fields', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ type: 'null', key: 'empty', value: 'null', path: 'empty' }],
			};

			const result = schemaToOutputSample(schema);

			expect(result).toEqual({
				empty: null,
			});
		});

		it('skips fields without keys', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [
					{ type: 'string', key: 'valid', value: 'value', path: 'valid' },
					{ type: 'string', value: 'no-key', path: '' }, // missing key
				],
			};

			const result = schemaToOutputSample(schema);

			// String value is redacted to ''
			expect(result).toEqual({
				valid: '',
			});
		});
	});

	describe('schemaToOutputSample - with real values (excludeValues=false)', () => {
		it('includes real string values', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ key: 'name', type: 'string', value: 'John Doe', path: '' }],
			};
			const result = schemaToOutputSample(schema, false);
			expect(result).toEqual({ name: 'John Doe' });
		});

		it('parses real number values from string representation', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ key: 'count', type: 'number', value: '42', path: '' }],
			};
			const result = schemaToOutputSample(schema, false);
			expect(result).toEqual({ count: 42 });
		});

		it('parses real boolean values from string representation', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ key: 'active', type: 'boolean', value: 'true', path: '' }],
			};
			const result = schemaToOutputSample(schema, false);
			expect(result).toEqual({ active: true });
		});

		it('includes real values in nested objects recursively', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [
					{
						key: 'user',
						type: 'object',
						path: '',
						value: [
							{ key: 'name', type: 'string', value: 'John', path: '' },
							{ key: 'age', type: 'number', value: '30', path: '' },
						],
					},
				],
			};
			const result = schemaToOutputSample(schema, false);
			expect(result).toEqual({ user: { name: 'John', age: 30 } });
		});

		it('truncates string values longer than 200 chars', () => {
			const longValue = 'a'.repeat(250);
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ key: 'data', type: 'string', value: longValue, path: '' }],
			};
			const result = schemaToOutputSample(schema, false);
			expect(result).toEqual({ data: 'a'.repeat(200) + '... [truncated]' });
		});

		it('handles [null] special value as null', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ key: 'data', type: 'string', value: '[null]', path: '' }],
			};
			const result = schemaToOutputSample(schema, false);
			expect(result).toEqual({ data: null });
		});

		it('handles <EMPTY> special value as undefined', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ key: 'data', type: 'string', value: '<EMPTY>', path: '' }],
			};
			const result = schemaToOutputSample(schema, false);
			expect(result).toEqual({ data: undefined });
		});

		it('includes multiple real values', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [
					{ type: 'string', key: 'id', value: 'usr_12345', path: 'id' },
					{ type: 'string', key: 'name', value: 'John Doe', path: 'name' },
					{ type: 'number', key: 'age', value: '30', path: 'age' },
					{ type: 'boolean', key: 'active', value: 'true', path: 'active' },
				],
			};
			const result = schemaToOutputSample(schema, false);
			expect(result).toEqual({
				id: 'usr_12345',
				name: 'John Doe',
				age: 30,
				active: true,
			});
		});

		it('still redacts when excludeValues is not passed (backward compat)', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ key: 'name', type: 'string', value: 'John Doe', path: '' }],
			};
			const result = schemaToOutputSample(schema);
			expect(result).toEqual({ name: '' });
		});
	});

	describe('generateSchemaJSDoc', () => {
		it('generates JSDoc for object schema with primitive fields', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [
					{ type: 'string', key: 'id', value: 'usr_12345', path: 'id' },
					{ type: 'string', key: 'name', value: 'John Doe', path: 'name' },
					{ type: 'number', key: 'age', value: '30', path: 'age' },
					{ type: 'boolean', key: 'active', value: 'true', path: 'active' },
				],
			};

			const result = generateSchemaJSDoc('Fetch Users', schema);

			expect(result).toContain("@output - access via $('Fetch Users').item.json");
			expect(result).toContain('id: string');
			expect(result).toContain('@example "usr_12345"');
			expect(result).toContain('name: string');
			expect(result).toContain('@example "John Doe"');
			expect(result).toContain('age: number');
			expect(result).toContain('active: boolean');
		});

		it('truncates long sample values', () => {
			const longValue = 'a'.repeat(50);
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ type: 'string', key: 'data', value: longValue, path: 'data' }],
			};

			const result = generateSchemaJSDoc('Node', schema);

			expect(result).toContain('@example "' + 'a'.repeat(40) + '..."');
			expect(result).not.toContain(longValue);
		});

		it('escapes newlines in sample values', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ type: 'string', key: 'text', value: 'line1\nline2', path: 'text' }],
			};

			const result = generateSchemaJSDoc('Node', schema);

			expect(result).toContain('@example "line1\\nline2"');
		});

		it('handles nested object fields', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ type: 'object', key: 'metadata', value: [], path: 'metadata' }],
			};

			const result = generateSchemaJSDoc('Node', schema);

			expect(result).toContain('metadata: Record<string, unknown>');
		});

		it('handles array fields', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ type: 'array', key: 'items', value: [], path: 'items' }],
			};

			const result = generateSchemaJSDoc('Node', schema);

			expect(result).toContain('items: unknown[]');
		});

		it('returns empty string for empty schema', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [],
			};

			const result = generateSchemaJSDoc('Node', schema);

			expect(result).toContain('@output');
			// No fields, just the header
		});

		it('formats [null] value as null in example', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ type: 'string', key: 'data', value: '[null]', path: 'data' }],
			};

			const result = generateSchemaJSDoc('Node', schema);

			expect(result).toContain('@example null');
			expect(result).not.toContain('@example "[null]"');
		});

		it('formats <EMPTY> value as undefined in example', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ type: 'string', key: 'data', value: '<EMPTY>', path: 'data' }],
			};

			const result = generateSchemaJSDoc('Node', schema);

			expect(result).toContain('@example undefined');
			expect(result).not.toContain('@example "<EMPTY>"');
		});

		it('handles special characters in node names', () => {
			const schema: Schema = {
				type: 'object',
				path: '',
				value: [{ type: 'string', key: 'id', value: '123', path: 'id' }],
			};

			const result = generateSchemaJSDoc("Node's Data (v2)", schema);

			expect(result).toContain("@output - access via $('Node's Data (v2)').item.json");
		});
	});
});
