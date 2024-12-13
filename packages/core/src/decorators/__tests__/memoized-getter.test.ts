import { ApplicationError } from 'n8n-workflow';

import { Memoized } from '../memoized-getter';

describe('Memoized Decorator', () => {
	class TestClass {
		private computeCount = 0;

		constructor(private readonly value: number = 42) {}

		@Memoized
		get expensiveComputation() {
			this.computeCount++;
			return this.value * 2;
		}

		getComputeCount() {
			return this.computeCount;
		}
	}

	it('should only compute the value once', () => {
		const instance = new TestClass();

		// First access should compute
		expect(instance.expensiveComputation).toBe(84);
		expect(instance.getComputeCount()).toBe(1);

		// Second access should use cached value
		expect(instance.expensiveComputation).toBe(84);
		expect(instance.getComputeCount()).toBe(1);

		// Third access should still use cached value
		expect(instance.expensiveComputation).toBe(84);
		expect(instance.getComputeCount()).toBe(1);
	});

	it('should cache values independently for different instances', () => {
		const instance1 = new TestClass(10);
		const instance2 = new TestClass(20);

		expect(instance1.expensiveComputation).toBe(20);
		expect(instance2.expensiveComputation).toBe(40);

		expect(instance1.getComputeCount()).toBe(1);
		expect(instance2.getComputeCount()).toBe(1);
	});

	it('should throw error when used on non-getter', () => {
		expect(() => {
			class InvalidClass {
				// @ts-expect-error this code will fail at compile time and at runtime
				@Memoized
				public normalProperty = 42;
			}
			new InvalidClass();
		}).toThrow(ApplicationError);
	});

	it('should make cached value non-enumerable', () => {
		const instance = new TestClass();
		instance.expensiveComputation; // Access to trigger caching

		const propertyNames = Object.keys(instance);
		expect(propertyNames).not.toContain('expensiveComputation');
	});

	it('should not allow reconfiguring the cached value', () => {
		const instance = new TestClass();
		instance.expensiveComputation; // Access to trigger caching

		expect(() => {
			Object.defineProperty(instance, 'expensiveComputation', {
				value: 999,
				configurable: true,
			});
		}).toThrow();
	});
});
