/**
 * Test suite for locale format utility
 */

import { describe, it, expect, vi } from 'vitest';
import createFormatTemplate from '../format';

describe('createFormatTemplate', () => {
	let template: ReturnType<typeof createFormatTemplate>;

	beforeEach(() => {
		template = createFormatTemplate();
	});

	describe('Basic Template Functionality', () => {
		it('should create a template function', () => {
			expect(typeof createFormatTemplate).toBe('function');
			expect(typeof template).toBe('function');
		});

		it('should return string unchanged when no placeholders', () => {
			const result = template('Simple text without placeholders');
			expect(result).toBe('Simple text without placeholders');
		});

		it('should replace single placeholder with object property', () => {
			const result = template('Hello {name}', { name: 'World' });
			expect(result).toBe('Hello World');
		});

		it('should replace multiple placeholders', () => {
			const result = template('User {name} has {count} items', {
				name: 'John',
				count: '5',
			});
			expect(result).toBe('User John has 5 items');
		});

		it('should handle numeric keys', () => {
			const result = template('Item {0} and item {1}', { 0: 'first', 1: 'second' });
			expect(result).toBe('Item first and item second');
		});
	});

	describe('Function Value Handling', () => {
		it('should call function value with args', () => {
			const mockFunction = vi.fn().mockReturnValue('function result');

			const result = template(mockFunction, 'arg1', 'arg2');

			expect(mockFunction).toHaveBeenCalledWith(['arg1', 'arg2']);
			expect(result).toBe('function result');
		});

		it('should call function with single argument', () => {
			const mockFunction = vi.fn().mockReturnValue('single arg result');

			const result = template(mockFunction, 'single');

			expect(mockFunction).toHaveBeenCalledWith(['single']);
			expect(result).toBe('single arg result');
		});

		it('should call function with no arguments', () => {
			const mockFunction = vi.fn().mockReturnValue('no args result');

			const result = template(mockFunction);

			expect(mockFunction).toHaveBeenCalledWith([]);
			expect(result).toBe('no args result');
		});

		it('should handle function that returns non-string', () => {
			const mockFunction = vi.fn().mockReturnValue(123);

			const result = template(mockFunction);

			expect(result).toBe(123);
		});
	});

	describe('Arguments Processing', () => {
		it('should handle single object argument', () => {
			const result = template('Hello {name}', { name: 'Single Object' });
			expect(result).toBe('Hello Single Object');
		});

		it('should handle multiple string arguments as array-like object', () => {
			const result = template('Args {0} and {1}', 'first', 'second');
			expect(result).toBe('Args first and second');
		});

		it('should handle mixed argument types', () => {
			const result = template('Mixed {0} and {1}', 'string', 123);
			expect(result).toBe('Mixed string and 123');
		});

		it('should handle empty arguments', () => {
			const result = template('No args {name}');
			expect(result).toBe('No args ');
		});
	});

	describe('Replacement Edge Cases', () => {
		it('should handle missing replacement keys', () => {
			const result = template('Missing {missing} key', { other: 'value' });
			expect(result).toBe('Missing  key');
		});

		it('should handle null replacement values', () => {
			const result = template('Null {value}', { value: null });
			expect(result).toBe('Null null');
		});

		it('should handle undefined replacement values', () => {
			const result = template('Undefined {value}', { value: undefined });
			expect(result).toBe('Undefined undefined');
		});

		it('should handle numeric replacement values', () => {
			const result = template('Number {count}', { count: 42 });
			expect(result).toBe('Number 42');
		});

		it('should handle boolean replacement values', () => {
			const result = template('Boolean {flag}', { flag: true });
			expect(result).toBe('Boolean true');
		});

		it('should handle object replacement values', () => {
			const result = template('Object {obj}', { obj: { nested: 'value' } });
			expect(result).toBe('Object [object Object]');
		});
	});

	describe('Escaped Placeholders', () => {
		it('should handle escaped placeholders with double braces', () => {
			const result = template('Escaped {{name}} and normal {name}', { name: 'Test' });
			expect(result).toBe('Escaped {name} and normal Test');
		});

		it('should handle complex escaped patterns', () => {
			const result = template('Complex {{0}} {{name}} {actual}', { actual: 'value' });
			expect(result).toBe('Complex {0} {name} value');
		});
	});

	describe('Special Character Handling', () => {
		it('should handle placeholders with underscores', () => {
			const result = template('Underscore {user_name}', { user_name: 'John_Doe' });
			expect(result).toBe('Underscore John_Doe');
		});

		it('should handle placeholders with numbers', () => {
			const result = template('Numbers {key123}', { key123: 'value123' });
			expect(result).toBe('Numbers value123');
		});

		it('should handle placeholders with mixed case', () => {
			const result = template('Mixed {CamelCase}', { CamelCase: 'CamelValue' });
			expect(result).toBe('Mixed CamelValue');
		});

		it('should handle multiple identical placeholders', () => {
			const result = template('Repeat {name} and {name} again', { name: 'Test' });
			expect(result).toBe('Repeat Test and Test again');
		});
	});

	describe('Replacement Object Edge Cases', () => {
		it('should handle objects without hasOwnProperty', () => {
			const objWithoutProto = Object.create(null);
			objWithoutProto.name = 'Test';

			const result = template('Hello {name}', objWithoutProto);
			expect(result).toBe('Hello ');
		});

		it('should handle array-like objects', () => {
			const arrayLike = { 0: 'first', 1: 'second', length: 2 };

			const result = template('Array {0} and {1}', arrayLike);
			expect(result).toBe('Array first and second');
		});

		it('should handle objects with symbol keys', () => {
			const symKey = Symbol('test');
			const objWithSymbol = { [symKey]: 'symbol value', name: 'regular' };

			const result = template('Symbol {name}', objWithSymbol);
			expect(result).toBe('Symbol regular');
		});

		it('should handle deeply nested objects', () => {
			const nestedObj = {
				level1: {
					level2: {
						level3: 'deep value',
					},
				},
				simple: 'simple value',
			};

			const result = template('Nested {simple}', nestedObj);
			expect(result).toBe('Nested simple value');
		});
	});

	describe('Performance and Reliability', () => {
		it('should handle very long templates efficiently', () => {
			const longTemplate = 'Long template ' + '{name} '.repeat(1000);
			const result = template(longTemplate, { name: 'Test' });

			expect(result).toContain('Long template');
			expect(result.split('Test')).toHaveLength(1001); // 1000 replacements + 1 split
		});

		it('should handle many replacements efficiently', () => {
			const manyReplacements: Record<string, string> = {};
			let templateStr = '';

			for (let i = 0; i < 100; i++) {
				manyReplacements[`key${i}`] = `value${i}`;
				templateStr += `{key${i}} `;
			}

			const result = template(templateStr, manyReplacements);

			expect(result).toContain('value0');
			expect(result).toContain('value99');
		});

		it('should handle circular reference in replacements safely', () => {
			const circular: any = { name: 'Test' };
			circular.self = circular;

			const result = template('Circular {name}', circular);
			expect(result).toBe('Circular Test');
		});
	});
});
