import { AssertionError, ok } from 'node:assert';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

import { Memoized } from '../memoized';

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
				normalProperty = 42;
			}
			new InvalidClass();
		}).toThrow(AssertionError);
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

	it('should work when child class references memoized getter in parent class', () => {
		class ParentClass {
			protected computeCount = 0;

			@Memoized
			get parentValue() {
				this.computeCount++;
				return 42;
			}

			getComputeCount() {
				return this.computeCount;
			}
		}

		class ChildClass extends ParentClass {
			get childValue() {
				return this.parentValue * 2;
			}
		}

		const child = new ChildClass();

		expect(child.childValue).toBe(84);
		expect(child.getComputeCount()).toBe(1);

		expect(child.childValue).toBe(84);
		expect(child.getComputeCount()).toBe(1);
	});

	it('should have correct property descriptor after memoization', () => {
		const instance = new TestClass();

		// Before accessing (original getter descriptor)
		const beforeDescriptor = Object.getOwnPropertyDescriptor(
			TestClass.prototype,
			'expensiveComputation',
		);
		expect(beforeDescriptor?.configurable).toBe(true);
		expect(beforeDescriptor?.enumerable).toBe(false);
		expect(typeof beforeDescriptor?.get).toBe('function');
		expect(beforeDescriptor?.set).toBeUndefined();

		// After accessing (memoized value descriptor)
		instance.expensiveComputation; // Trigger memoization
		const afterDescriptor = Object.getOwnPropertyDescriptor(instance, 'expensiveComputation');
		expect(afterDescriptor?.configurable).toBe(false);
		expect(afterDescriptor?.enumerable).toBe(false);
		expect(afterDescriptor?.writable).toBe(false);
		expect(afterDescriptor?.value).toBe(84);
		expect(afterDescriptor?.get).toBeUndefined();
	});

	it('should not prevent garbage collection of instances', async () => {
		setFlagsFromString('--expose_gc');
		const gc = runInNewContext('gc') as unknown as () => void;

		let instance: TestClass | undefined = new TestClass();
		const weakRef = new WeakRef(instance);
		instance.expensiveComputation;

		// Remove the strong reference
		instance = undefined;

		// Wait for garbage collection, forcing it if needed
		await new Promise((resolve) => setTimeout(resolve, 10));
		gc();

		const ref = weakRef.deref();
		ok(!ref, 'GC did not collect the instance ref');
	});
});
