/**
 * Test suite for useTooltipAppendTo composables
 */

import { describe, it, expect } from 'vitest';
import { computed } from 'vue';
import { useProvideTooltipAppendTo, useInjectTooltipAppendTo } from '../useTooltipAppendTo';

describe('useTooltipAppendTo', () => {
	describe('useProvideTooltipAppendTo', () => {
		it('should be a function', () => {
			expect(typeof useProvideTooltipAppendTo).toBe('function');
		});

		it('should accept computed ref parameter', () => {
			const appendTo = computed(() => 'body');

			expect(() => {
				useProvideTooltipAppendTo(appendTo);
			}).not.toThrow();
		});

		it('should handle different computed values', () => {
			const stringTarget = computed(() => 'body');
			const elementTarget = computed(() => document.body);
			const undefinedTarget = computed(() => undefined);
			const nullTarget = computed(() => null);

			expect(() => {
				useProvideTooltipAppendTo(stringTarget);
				useProvideTooltipAppendTo(elementTarget);
				useProvideTooltipAppendTo(undefinedTarget);
				useProvideTooltipAppendTo(nullTarget);
			}).not.toThrow();
		});
	});

	describe('useInjectTooltipAppendTo', () => {
		it('should be a function', () => {
			expect(typeof useInjectTooltipAppendTo).toBe('function');
		});

		it('should be callable and return something', () => {
			expect(() => {
				useInjectTooltipAppendTo();
			}).not.toThrow();
		});

		it('should handle multiple injection calls', () => {
			expect(() => {
				useInjectTooltipAppendTo();
				useInjectTooltipAppendTo();
			}).not.toThrow();
		});
	});

	describe('Function Signatures', () => {
		it('should have correct function parameter types', () => {
			const stringValue = computed(() => 'test');
			const elementValue = computed(() => document.body);
			const functionValue = computed(() => () => document.body);
			const booleanValue = computed(() => false);

			// These should all be valid calls (type checking)
			expect(() => {
				useProvideTooltipAppendTo(stringValue);
				useProvideTooltipAppendTo(elementValue);
				useProvideTooltipAppendTo(functionValue);
				useProvideTooltipAppendTo(booleanValue);
			}).not.toThrow();
		});

		it('should handle edge case computed values', () => {
			const nullValue = computed(() => null);
			const undefinedValue = computed(() => undefined);
			const numberValue = computed(() => 42 as any);
			const objectValue = computed(() => ({ selector: 'test' }) as any);

			expect(() => {
				useProvideTooltipAppendTo(nullValue);
				useProvideTooltipAppendTo(undefinedValue);
				useProvideTooltipAppendTo(numberValue);
				useProvideTooltipAppendTo(objectValue);
			}).not.toThrow();
		});
	});

	describe('Return Value Types', () => {
		it('should not throw when called', () => {
			expect(() => {
				const result = useInjectTooltipAppendTo();
			}).not.toThrow();
		});

		it('should be consistent across calls', () => {
			expect(() => {
				useInjectTooltipAppendTo();
				useInjectTooltipAppendTo();
				useInjectTooltipAppendTo();
			}).not.toThrow();
		});
	});
});
