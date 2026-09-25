import { describe, it, expect, afterEach } from 'vitest';
import type { INodeParameters } from 'n8n-workflow';
import { setParameterValue } from './parameterUtils';

describe('parameterUtils', () => {
	describe('setParameterValue', () => {
		it('should set a simple value', () => {
			const target = { foo: 'bar' };
			setParameterValue(target, 'foo', 'baz');
			expect(target.foo).toBe('baz');
		});

		it('should set a nested value', () => {
			const target = { foo: { bar: 'baz' } };
			setParameterValue(target, 'foo.bar', 'qux');
			expect(target.foo.bar).toBe('qux');
		});

		it('should unset a value when undefined', () => {
			const target = { foo: 'bar', baz: 'qux' };
			setParameterValue(target, 'foo', undefined);
			expect(target).toEqual({ baz: 'qux' });
		});

		it('should delete array item when path ends with index', () => {
			const target = { items: ['a', 'b', 'c'] };
			setParameterValue(target, 'items[1]', undefined);
			expect(target.items).toEqual(['a', 'c']);
		});

		it('should delete nested array item', () => {
			const target = {
				headers: {
					values: [
						{ name: 'foo', value: 'bar' },
						{ name: 'baz', value: 'qux' },
						{ name: 'test', value: '123' },
					],
				},
			};
			setParameterValue(target, 'headers.values[1]', undefined);
			expect(target.headers.values).toEqual([
				{ name: 'foo', value: 'bar' },
				{ name: 'test', value: '123' },
			]);
		});

		it('should update array item when value is provided', () => {
			const target = { items: ['a', 'b', 'c'] };
			setParameterValue(target, 'items[1]', 'updated');
			expect(target.items).toEqual(['a', 'updated', 'c']);
		});

		it('should handle non-existent paths gracefully', () => {
			const target = {};
			setParameterValue(target, 'nonexistent[0]', undefined);
			expect(target).toEqual({});
		});

		it('should handle paths with brackets that are not arrays', () => {
			const target = { foo: 'bar' };
			setParameterValue(target, 'foo[abc]', undefined);
			expect(target).toEqual({ foo: 'bar' });
		});
	});

	describe('dot-notation paths that name inherited members', () => {
		// Guard the shared prototype so a regression in one test cannot cascade to others.
		const hadOwnCall = Object.prototype.hasOwnProperty.call(Object.prototype.toString, 'call');

		afterEach(() => {
			if (!hadOwnCall) {
				delete (Object.prototype.toString as unknown as { call?: unknown }).call;
			}
		});

		it('keeps built-in object prototypes intact for a top-level inherited key', () => {
			const target: INodeParameters = {};

			setParameterValue(target, 'toString.call', 'x');

			// The shared prototype member must be untouched.
			expect(Object.prototype.hasOwnProperty.call(Object.prototype.toString, 'call')).toBe(false);
			expect(Object.prototype.toString.call([])).toBe('[object Array]');
			// The value lands as a plain own property on the target instead.
			expect(Object.prototype.hasOwnProperty.call(target, 'toString')).toBe(true);
			expect((target as { toString: { call: unknown } }).toString.call).toBe('x');
		});

		it('keeps built-in object prototypes intact for a nested inherited key', () => {
			const target: INodeParameters = {};

			setParameterValue(target, 'a.toString.call', 'y');

			expect(Object.prototype.hasOwnProperty.call(Object.prototype.toString, 'call')).toBe(false);
			expect(Object.prototype.toString.call({})).toBe('[object Object]');
			expect((target as { a: { toString: { call: unknown } } }).a.toString.call).toBe('y');
		});
	});
});
