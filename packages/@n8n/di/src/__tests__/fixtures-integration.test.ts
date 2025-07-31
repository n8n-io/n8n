/**
 * Fixture Integration Tests
 *
 * Tests for circular dependency detection using fixture services.
 * These tests ensure proper coverage of the circular dependency detection
 * mechanism and fixture service instantiation.
 */
import { Container, Service } from '../di';
import { ServiceA } from './fixtures/service-a';
import { ServiceB } from './fixtures/service-b';

describe('Fixture Integration Tests', () => {
	beforeEach(() => {
		Container.reset();
	});

	/**
	 * Test circular dependency detection using fixture services
	 */
	describe('circular dependency scenarios', () => {
		it('should detect circular dependency between ServiceA and ServiceB', () => {
			expect(() => Container.get(ServiceA)).toThrow();
			expect(() => Container.get(ServiceB)).toThrow();
		});

		it('should provide proper error messages for circular dependencies', () => {
			try {
				Container.get(ServiceA);
				fail('Should have thrown circular dependency error');
			} catch (error) {
				expect((error as Error).message).toContain('[DI]');
				expect((error as Error).message).toContain('Circular dependency detected');
			}
		});

		it('should handle partial resolution before circular dependency detection', () => {
			// Test that we can detect the circular dependency at any point in the chain
			expect(() => Container.get(ServiceB)).toThrowError(/Circular dependency detected/);
		});
	});

	/**
	 * Test fixture service registration
	 */
	describe('fixture service registration', () => {
		it('should register fixture services correctly', () => {
			expect(Container.has(ServiceA)).toBe(true);
			expect(Container.has(ServiceB)).toBe(true);
		});

		it('should maintain fixture service registration after container reset', () => {
			Container.reset();
			expect(Container.has(ServiceA)).toBe(true);
			expect(Container.has(ServiceB)).toBe(true);
		});
	});

	/**
	 * Test manual resolution of circular dependencies
	 */
	describe('manual circular dependency resolution', () => {
		it('should allow manual instance setting to break circular dependencies', () => {
			// Define proper types for mock instances
			type MockServiceA = { b: MockServiceB | null };
			type MockServiceB = { a: MockServiceA | null };

			// Create mock instances
			const mockServiceB: MockServiceB = { a: null };
			const mockServiceA: MockServiceA = { b: mockServiceB };
			mockServiceB.a = mockServiceA;

			// Set instances manually to break circular dependency
			Container.set(ServiceA, mockServiceA as unknown as InstanceType<typeof ServiceA>);
			Container.set(ServiceB, mockServiceB as unknown as InstanceType<typeof ServiceB>);

			// Should now be able to retrieve without circular dependency error
			const instanceA = Container.get(ServiceA);
			const instanceB = Container.get(ServiceB);

			expect(instanceA).toBe(mockServiceA);
			expect(instanceB).toBe(mockServiceB);
			expect(instanceA.b).toBe(instanceB);
			expect(instanceB.a).toBe(instanceA);
		});
	});

	/**
	 * Test complex scenarios with fixture services
	 */
	describe('complex fixture scenarios', () => {
		it('should handle factory-based resolution of circular dependencies', () => {
			// Create a factory that can handle the circular dependency
			type CircularRef = { b: CircularRef | null; a?: CircularRef };

			@Service({
				factory: (): CircularRef => {
					const serviceA: CircularRef = { b: null };
					const serviceB: CircularRef = { a: serviceA, b: null };
					serviceA.b = serviceB;
					return serviceA;
				},
			})
			class ResolvedServiceA {
				b: { a: ResolvedServiceA } | null = null;
			}

			const instance = Container.get(ResolvedServiceA) as CircularRef;
			expect(instance.b).toBeDefined();
			expect(instance.b?.a).toBe(instance);
		});
	});
});
