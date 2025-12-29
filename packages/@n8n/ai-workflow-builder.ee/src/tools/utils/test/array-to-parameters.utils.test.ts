import type { ParameterEntry } from '@/schemas/parameter-entry.schema';

import {
	parseParameterValue,
	setAtPath,
	arrayToNodeParameters,
	mergeArrayParameters,
	ParameterParseError,
} from '../array-to-parameters.utils';

describe('array-to-parameters.utils', () => {
	describe('parseParameterValue', () => {
		it('should return string values as-is', () => {
			const entry: ParameterEntry = { path: 'method', type: 'string', value: 'POST' };
			expect(parseParameterValue(entry)).toBe('POST');
		});

		it('should handle string expressions', () => {
			const entry: ParameterEntry = {
				path: 'url',
				type: 'string',
				value: '={{ $json.apiUrl }}',
			};
			expect(parseParameterValue(entry)).toBe('={{ $json.apiUrl }}');
		});

		it('should parse integer numbers', () => {
			const entry: ParameterEntry = { path: 'timeout', type: 'number', value: '30' };
			expect(parseParameterValue(entry)).toBe(30);
		});

		it('should parse floating point numbers', () => {
			const entry: ParameterEntry = { path: 'rate', type: 'number', value: '3.14' };
			expect(parseParameterValue(entry)).toBe(3.14);
		});

		it('should parse negative numbers', () => {
			const entry: ParameterEntry = { path: 'offset', type: 'number', value: '-10' };
			expect(parseParameterValue(entry)).toBe(-10);
		});

		it('should throw on invalid number', () => {
			const entry: ParameterEntry = { path: 'count', type: 'number', value: 'not-a-number' };
			expect(() => parseParameterValue(entry)).toThrow(ParameterParseError);
			expect(() => parseParameterValue(entry)).toThrow('Invalid number value for path "count"');
		});

		it('should parse boolean true', () => {
			const entry: ParameterEntry = { path: 'enabled', type: 'boolean', value: 'true' };
			expect(parseParameterValue(entry)).toBe(true);
		});

		it('should parse boolean false', () => {
			const entry: ParameterEntry = { path: 'enabled', type: 'boolean', value: 'false' };
			expect(parseParameterValue(entry)).toBe(false);
		});

		it('should handle case-insensitive boolean values', () => {
			expect(parseParameterValue({ path: 'a', type: 'boolean', value: 'TRUE' })).toBe(true);
			expect(parseParameterValue({ path: 'b', type: 'boolean', value: 'False' })).toBe(false);
			expect(parseParameterValue({ path: 'c', type: 'boolean', value: 'TRUE' })).toBe(true);
		});

		it('should throw on invalid boolean', () => {
			const entry: ParameterEntry = { path: 'flag', type: 'boolean', value: 'yes' };
			expect(() => parseParameterValue(entry)).toThrow(ParameterParseError);
			expect(() => parseParameterValue(entry)).toThrow('Invalid boolean value for path "flag"');
		});

		// Edge cases
		it('should parse zero as number', () => {
			const entry: ParameterEntry = { path: 'count', type: 'number', value: '0' };
			expect(parseParameterValue(entry)).toBe(0);
		});

		it('should parse negative zero as number', () => {
			const entry: ParameterEntry = { path: 'x', type: 'number', value: '-0' };
			expect(parseParameterValue(entry)).toBe(-0);
			expect(Object.is(parseParameterValue(entry), -0)).toBe(true);
		});

		it('should parse empty string for number type as 0 (JavaScript Number behavior)', () => {
			// Note: Number('') === 0 in JavaScript, so this doesn't throw
			const entry: ParameterEntry = { path: 'count', type: 'number', value: '' };
			expect(parseParameterValue(entry)).toBe(0);
		});

		it('should parse whitespace-only string for number as 0 (JavaScript Number behavior)', () => {
			// Note: Number('   ') === 0 in JavaScript (whitespace is trimmed)
			const entry: ParameterEntry = { path: 'count', type: 'number', value: '   ' };
			expect(parseParameterValue(entry)).toBe(0);
		});

		it('should handle scientific notation for numbers', () => {
			expect(parseParameterValue({ path: 'x', type: 'number', value: '1e10' })).toBe(1e10);
			expect(parseParameterValue({ path: 'x', type: 'number', value: '1.5e-3' })).toBe(0.0015);
			expect(parseParameterValue({ path: 'x', type: 'number', value: '2E5' })).toBe(200000);
		});

		it('should handle Infinity for numbers', () => {
			expect(parseParameterValue({ path: 'x', type: 'number', value: 'Infinity' })).toBe(Infinity);
			expect(parseParameterValue({ path: 'x', type: 'number', value: '-Infinity' })).toBe(
				-Infinity,
			);
		});

		it('should throw on whitespace-only boolean values', () => {
			const entry: ParameterEntry = { path: 'flag', type: 'boolean', value: '  ' };
			expect(() => parseParameterValue(entry)).toThrow(ParameterParseError);
		});

		it('should handle boolean with surrounding whitespace via case-insensitive match', () => {
			// Current implementation uses toLowerCase() which doesn't trim
			// ' true ' !== 'true' so it will throw
			const entry: ParameterEntry = { path: 'flag', type: 'boolean', value: ' true ' };
			expect(() => parseParameterValue(entry)).toThrow(ParameterParseError);
		});
	});

	describe('setAtPath', () => {
		it('should set simple path', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'method', 'POST');
			expect(obj).toEqual({ method: 'POST' });
		});

		it('should set nested path', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'options.timeout', 30);
			expect(obj).toEqual({ options: { timeout: 30 } });
		});

		it('should set deeply nested path', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'level1.level2.level3.value', 'deep');
			expect(obj).toEqual({
				level1: { level2: { level3: { value: 'deep' } } },
			});
		});

		it('should handle array indices', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'headers.0.name', 'Content-Type');
			expect(obj).toEqual({ headers: [{ name: 'Content-Type' }] });
		});

		it('should handle multiple array indices', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'items.0', 'first');
			setAtPath(obj, 'items.1', 'second');
			expect(obj).toEqual({ items: ['first', 'second'] });
		});

		it('should preserve existing values when setting new paths', () => {
			const obj: Record<string, unknown> = { existing: 'value' };
			setAtPath(obj, 'newPath.nested', 'newValue');
			expect(obj).toEqual({
				existing: 'value',
				newPath: { nested: 'newValue' },
			});
		});

		it('should override existing value at path', () => {
			const obj: Record<string, unknown> = { key: 'old' };
			setAtPath(obj, 'key', 'new');
			expect(obj).toEqual({ key: 'new' });
		});

		it('should handle mixed objects and arrays in path', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'data.items.0.nested.value', 'test');
			expect(obj).toEqual({
				data: { items: [{ nested: { value: 'test' } }] },
			});
		});

		// Edge cases
		it('should handle non-contiguous array indices', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'items.5.name', 'value');
			expect(obj).toEqual({
				items: [undefined, undefined, undefined, undefined, undefined, { name: 'value' }],
			});
		});

		it('should handle very deep nesting', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'a.b.c.d.e.f.g.h', 'deep');
			expect(obj).toEqual({
				a: { b: { c: { d: { e: { f: { g: { h: 'deep' } } } } } } },
			});
		});

		it('should handle numeric-looking object keys that are not pure digits', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'obj.123abc.value', 'test');
			// '123abc' is not purely numeric, so it should be treated as object key
			expect(obj).toEqual({ obj: { '123abc': { value: 'test' } } });
		});

		it('should handle paths ending in array index', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'items.0', 'value');
			expect(obj).toEqual({ items: ['value'] });
		});

		it('should handle path with empty segment (consecutive dots)', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'a..b', 'value');
			// Empty segment creates an empty string key
			expect(obj).toEqual({ a: { '': { b: 'value' } } });
		});

		it('should handle single segment path', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'x', 'value');
			expect(obj).toEqual({ x: 'value' });
		});

		it('should handle array inside array path', () => {
			const obj: Record<string, unknown> = {};
			setAtPath(obj, 'matrix.0.0', 'value');
			expect(obj).toEqual({ matrix: [['value']] });
		});
	});

	describe('arrayToNodeParameters', () => {
		it('should convert simple string parameter', () => {
			const entries: ParameterEntry[] = [{ path: 'method', type: 'string', value: 'POST' }];
			expect(arrayToNodeParameters(entries)).toEqual({ method: 'POST' });
		});

		it('should convert number parameter', () => {
			const entries: ParameterEntry[] = [{ path: 'timeout', type: 'number', value: '30' }];
			expect(arrayToNodeParameters(entries)).toEqual({ timeout: 30 });
		});

		it('should convert boolean parameter', () => {
			const entries: ParameterEntry[] = [{ path: 'sendHeaders', type: 'boolean', value: 'true' }];
			expect(arrayToNodeParameters(entries)).toEqual({ sendHeaders: true });
		});

		it('should handle nested paths', () => {
			const entries: ParameterEntry[] = [
				{ path: 'options.retry.maxRetries', type: 'number', value: '3' },
			];
			expect(arrayToNodeParameters(entries)).toEqual({
				options: { retry: { maxRetries: 3 } },
			});
		});

		it('should handle array indices', () => {
			const entries: ParameterEntry[] = [
				{ path: 'headers.0.name', type: 'string', value: 'Content-Type' },
				{ path: 'headers.0.value', type: 'string', value: 'application/json' },
			];
			expect(arrayToNodeParameters(entries)).toEqual({
				headers: [{ name: 'Content-Type', value: 'application/json' }],
			});
		});

		it('should handle multiple array items', () => {
			const entries: ParameterEntry[] = [
				{ path: 'headers.0.name', type: 'string', value: 'Content-Type' },
				{ path: 'headers.0.value', type: 'string', value: 'application/json' },
				{ path: 'headers.1.name', type: 'string', value: 'Authorization' },
				{ path: 'headers.1.value', type: 'string', value: 'Bearer token' },
			];
			expect(arrayToNodeParameters(entries)).toEqual({
				headers: [
					{ name: 'Content-Type', value: 'application/json' },
					{ name: 'Authorization', value: 'Bearer token' },
				],
			});
		});

		it('should handle complex HTTP request example', () => {
			const entries: ParameterEntry[] = [
				{ path: 'method', type: 'string', value: 'POST' },
				{ path: 'url', type: 'string', value: 'https://api.example.com' },
				{ path: 'sendHeaders', type: 'boolean', value: 'true' },
				{ path: 'headerParameters.parameters.0.name', type: 'string', value: 'Content-Type' },
				{
					path: 'headerParameters.parameters.0.value',
					type: 'string',
					value: 'application/json',
				},
				{ path: 'timeout', type: 'number', value: '30000' },
			];

			expect(arrayToNodeParameters(entries)).toEqual({
				method: 'POST',
				url: 'https://api.example.com',
				sendHeaders: true,
				headerParameters: {
					parameters: [{ name: 'Content-Type', value: 'application/json' }],
				},
				timeout: 30000,
			});
		});

		it('should handle expression values', () => {
			const entries: ParameterEntry[] = [
				{ path: 'url', type: 'string', value: '={{ $json.apiUrl }}' },
				{ path: 'body.data', type: 'string', value: "={{ $('Previous Node').item.json }}" },
			];

			expect(arrayToNodeParameters(entries)).toEqual({
				url: '={{ $json.apiUrl }}',
				body: { data: "={{ $('Previous Node').item.json }}" },
			});
		});

		it('should handle empty array', () => {
			expect(arrayToNodeParameters([])).toEqual({});
		});

		it('should throw on invalid number value', () => {
			const entries: ParameterEntry[] = [{ path: 'count', type: 'number', value: 'invalid' }];
			expect(() => arrayToNodeParameters(entries)).toThrow(ParameterParseError);
		});

		it('should throw on invalid boolean value', () => {
			const entries: ParameterEntry[] = [{ path: 'enabled', type: 'boolean', value: 'maybe' }];
			expect(() => arrayToNodeParameters(entries)).toThrow(ParameterParseError);
		});

		it('should handle Set node assignments structure', () => {
			const entries: ParameterEntry[] = [
				{ path: 'assignments.assignments.0.id', type: 'string', value: 'id-1' },
				{ path: 'assignments.assignments.0.name', type: 'string', value: 'message' },
				{
					path: 'assignments.assignments.0.value',
					type: 'string',
					value: "={{ $('Node').item.json.text }}",
				},
				{ path: 'assignments.assignments.0.type', type: 'string', value: 'string' },
			];

			expect(arrayToNodeParameters(entries)).toEqual({
				assignments: {
					assignments: [
						{
							id: 'id-1',
							name: 'message',
							value: "={{ $('Node').item.json.text }}",
							type: 'string',
						},
					],
				},
			});
		});

		it('should handle ResourceLocator flattened structure', () => {
			const entries: ParameterEntry[] = [
				{ path: 'resource.__rl', type: 'boolean', value: 'true' },
				{ path: 'resource.mode', type: 'string', value: 'list' },
				{ path: 'resource.value', type: 'string', value: 'resource-123' },
			];

			expect(arrayToNodeParameters(entries)).toEqual({
				resource: {
					__rl: true,
					mode: 'list',
					value: 'resource-123',
				},
			});
		});

		// Edge cases
		it('should handle duplicate paths (last wins)', () => {
			const entries: ParameterEntry[] = [
				{ path: 'x', type: 'string', value: 'first' },
				{ path: 'x', type: 'string', value: 'last' },
			];
			expect(arrayToNodeParameters(entries)).toEqual({ x: 'last' });
		});

		it('should handle path overwriting parent object with primitive', () => {
			const entries: ParameterEntry[] = [
				{ path: 'obj.nested', type: 'string', value: 'a' },
				{ path: 'obj', type: 'string', value: 'b' },
			];
			// Later entry overwrites earlier structure
			expect(arrayToNodeParameters(entries)).toEqual({ obj: 'b' });
		});

		it('should handle path extending primitive to object', () => {
			const entries: ParameterEntry[] = [
				{ path: 'obj', type: 'string', value: 'initial' },
				{ path: 'obj.nested', type: 'string', value: 'value' },
			];
			// This may cause runtime issues but tests current behavior
			expect(() => arrayToNodeParameters(entries)).toThrow();
		});

		it('should handle mixed type conversions in same structure', () => {
			const entries: ParameterEntry[] = [
				{ path: 'config.timeout', type: 'number', value: '30' },
				{ path: 'config.enabled', type: 'boolean', value: 'true' },
				{ path: 'config.name', type: 'string', value: 'test' },
			];
			expect(arrayToNodeParameters(entries)).toEqual({
				config: {
					timeout: 30,
					enabled: true,
					name: 'test',
				},
			});
		});
	});

	describe('mergeArrayParameters', () => {
		it('should merge array entries with existing parameters', () => {
			const existing = { method: 'GET', url: 'https://old.com' };
			const entries: ParameterEntry[] = [{ path: 'url', type: 'string', value: 'https://new.com' }];

			expect(mergeArrayParameters(existing, entries)).toEqual({
				method: 'GET',
				url: 'https://new.com',
			});
		});

		it('should add new parameters from array entries', () => {
			const existing = { method: 'GET' };
			const entries: ParameterEntry[] = [
				{ path: 'url', type: 'string', value: 'https://api.com' },
				{ path: 'timeout', type: 'number', value: '30' },
			];

			expect(mergeArrayParameters(existing, entries)).toEqual({
				method: 'GET',
				url: 'https://api.com',
				timeout: 30,
			});
		});

		it('should not mutate original parameters', () => {
			const existing = { method: 'GET', nested: { value: 'original' } };
			const entries: ParameterEntry[] = [
				{ path: 'nested.value', type: 'string', value: 'updated' },
			];

			const result = mergeArrayParameters(existing, entries);

			expect(existing.nested.value).toBe('original');
			expect(result.nested).toEqual({ value: 'updated' });
		});

		it('should handle nested path merging', () => {
			const existing = {
				options: {
					retry: { enabled: true, maxRetries: 3 },
					timeout: 5000,
				},
			};
			const entries: ParameterEntry[] = [
				{ path: 'options.retry.maxRetries', type: 'number', value: '5' },
				{ path: 'options.newOption', type: 'boolean', value: 'true' },
			];

			expect(mergeArrayParameters(existing, entries)).toEqual({
				options: {
					retry: { enabled: true, maxRetries: 5 },
					timeout: 5000,
					newOption: true,
				},
			});
		});

		it('should handle empty entries array', () => {
			const existing = { method: 'GET', url: 'https://api.com' };
			expect(mergeArrayParameters(existing, [])).toEqual(existing);
		});

		it('should handle empty existing parameters', () => {
			const entries: ParameterEntry[] = [{ path: 'method', type: 'string', value: 'POST' }];
			expect(mergeArrayParameters({}, entries)).toEqual({ method: 'POST' });
		});
	});
});
