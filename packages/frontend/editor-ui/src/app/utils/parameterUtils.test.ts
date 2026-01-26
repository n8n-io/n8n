import { describe, it, expect } from 'vitest';
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
});
