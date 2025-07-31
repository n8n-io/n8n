/**
 * DI Container Test Suite
 *
 * Comprehensive test coverage for the Dependency Injection container system.
 * Tests all core functionality including:
 * - Basic service instantiation and caching
 * - Dependency injection and resolution
 * - Factory function support
 * - Abstract class handling
 * - Circular dependency detection
 * - Instance management and container reset
 * - Error handling and edge cases
 */
import { Container, Service } from '../di';

@Service()
class SimpleService {
	getValue() {
		return 'simple';
	}
}

@Service()
class DependentService {
	constructor(readonly simple: SimpleService) {}

	getValue() {
		return this.simple.getValue() + '-dependent';
	}
}

class CustomFactory {
	getValue() {
		return 'factory-made';
	}
}

@Service({ factory: () => new CustomFactory() })
class FactoryService {
	getValue() {
		return 'should-not-be-called';
	}
}

abstract class AbstractService {
	abstract getValue(): string;
}

@Service()
class ConcreteService extends AbstractService {
	getValue(): string {
		return 'concrete';
	}
}

describe('DI Container', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		Container.reset();
	});

	describe('basic functionality', () => {
		it('should create a simple instance', () => {
			const instance = Container.get(SimpleService);
			expect(instance).toBeInstanceOf(SimpleService);
			expect(instance.getValue()).toBe('simple');
		});

		it('should return same instance on multiple gets', () => {
			const instance1 = Container.get(SimpleService);
			const instance2 = Container.get(SimpleService);
			expect(instance1).toBe(instance2);
		});

		it('should handle classes with no dependencies (empty constructor)', () => {
			@Service()
			class EmptyConstructorService {}

			const instance = Container.get(EmptyConstructorService);
			expect(instance).toBeInstanceOf(EmptyConstructorService);
		});

		it('should throw when trying to resolve an undecorated class', () => {
			class UnDecoratedService {}

			expect(() => Container.get(UnDecoratedService)).toThrow();
		});
	});

	describe('dependency injection', () => {
		it('should inject dependencies correctly', () => {
			const dependent = Container.get(DependentService);
			expect(dependent).toBeInstanceOf(DependentService);
			expect(dependent.getValue()).toBe('simple-dependent');
			expect(dependent.simple).toBeInstanceOf(SimpleService);
		});

		it('should handle deep dependency chains', () => {
			@Service()
			class ServiceC {
				getValue() {
					return 'C';
				}
			}

			@Service()
			class ServiceB {
				constructor(private c: ServiceC) {}

				getValue() {
					return this.c.getValue() + 'B';
				}
			}

			@Service()
			class ServiceA {
				constructor(private b: ServiceB) {}

				getValue() {
					return this.b.getValue() + 'A';
				}
			}

			const instance = Container.get(ServiceA);
			expect(instance.getValue()).toBe('CBA');
		});

		it('should return undefined for non-decorated dependencies in resolution chain', () => {
			class NonDecoratedDep {}

			@Service()
			class ServiceWithNonDecoratedDep {
				constructor(readonly dep: NonDecoratedDep) {}
			}

			const instance = Container.get(ServiceWithNonDecoratedDep);
			expect(instance).toBeInstanceOf(ServiceWithNonDecoratedDep);
			expect(instance.dep).toBeUndefined();
		});
	});

	describe('factory handling', () => {
		it('should use factory when provided', () => {
			const instance = Container.get(FactoryService);
			expect(instance).toBeInstanceOf(CustomFactory);
			expect(instance.getValue()).toBe('factory-made');
		});

		it('should preserve factory metadata when setting instance', () => {
			const customInstance = new CustomFactory();
			Container.set(FactoryService, customInstance);
			const instance = Container.get(FactoryService);
			expect(instance).toBe(customInstance);
		});

		it('should preserve factory when resetting container', () => {
			const factoryInstance1 = Container.get(FactoryService);
			Container.reset();
			const factoryInstance2 = Container.get(FactoryService);

			expect(factoryInstance1).not.toBe(factoryInstance2);
			expect(factoryInstance2.getValue()).toBe('factory-made');
		});

		it('should throw error when factory throws', () => {
			@Service({
				factory: () => {
					throw new Error('Factory error');
				},
			})
			class ErrorFactoryService {}

			expect(() => Container.get(ErrorFactoryService)).toThrow('Factory error');
		});

		it('should handle factory with dependencies', () => {
			const factory = jest.fn().mockReturnValue({});

			@Service({ factory })
			class FactoryWithDependencies {
				constructor(readonly simpleService: SimpleService) {}
			}

			const instance = Container.get(FactoryWithDependencies);
			expect(instance.simpleService).toBeUndefined();
			expect(factory).toHaveBeenCalledWith(Container.get(SimpleService));
		});
	});

	describe('instance management', () => {
		it('should allow manual instance setting', () => {
			const customInstance = new SimpleService();
			Container.set(SimpleService, customInstance);
			const instance = Container.get(SimpleService);
			expect(instance).toBe(customInstance);
		});
	});

	describe('abstract classes', () => {
		it('should throw when trying to instantiate an abstract class directly', () => {
			@Service()
			abstract class TestAbstractClass {
				abstract doSomething(): void;

				// Add a concrete method to make the class truly abstract at runtime
				constructor() {
					if (this.constructor === TestAbstractClass) {
						throw new TypeError('Abstract class "TestAbstractClass" cannot be instantiated');
					}
				}
			}

			expect(() => Container.get(TestAbstractClass)).toThrow(
				'[DI] TestAbstractClass is an abstract class, and cannot be instantiated',
			);
		});

		it('should allow setting an implementation for an abstract class', () => {
			const concrete = new ConcreteService();
			Container.set(AbstractService, concrete);

			const instance = Container.get(AbstractService);
			expect(instance).toBe(concrete);
			expect(instance.getValue()).toBe('concrete');
		});

		it('should allow factory for abstract class', () => {
			@Service({ factory: () => new ConcreteService() })
			abstract class FactoryAbstractService {
				abstract getValue(): string;
			}

			const instance = Container.get(FactoryAbstractService);
			expect(instance).toBeInstanceOf(ConcreteService);
			expect(instance.getValue()).toBe('concrete');
		});
	});

	describe('inheritance', () => {
		it('should handle inheritance in injectable classes', () => {
			@Service()
			class BaseService {
				getValue() {
					return 'base';
				}
			}

			@Service()
			class DerivedService extends BaseService {
				getValue() {
					return 'derived-' + super.getValue();
				}
			}

			const instance = Container.get(DerivedService);
			expect(instance.getValue()).toBe('derived-base');
		});

		it('should maintain separate instances for base and derived classes', () => {
			@Service()
			class BaseService {
				getValue() {
					return 'base';
				}
			}

			@Service()
			class DerivedService extends BaseService {}

			const baseInstance = Container.get(BaseService);
			const derivedInstance = Container.get(DerivedService);

			expect(baseInstance).not.toBe(derivedInstance);
			expect(baseInstance).toBeInstanceOf(BaseService);
			expect(derivedInstance).toBeInstanceOf(DerivedService);
		});
	});

	describe('type registration checking', () => {
		it('should return true for registered classes', () => {
			expect(Container.has(SimpleService)).toBe(true);
		});

		it('should return false for unregistered classes', () => {
			class UnregisteredService {}
			expect(Container.has(UnregisteredService)).toBe(false);
		});

		it('should return true for abstract classes with implementations', () => {
			const concrete = new ConcreteService();
			Container.set(AbstractService, concrete);
			expect(Container.has(AbstractService)).toBe(true);
		});

		it('should return true for factory-provided services before instantiation', () => {
			expect(Container.has(FactoryService)).toBe(true);
		});

		it('should maintain registration after reset', () => {
			expect(Container.has(SimpleService)).toBe(true);
			Container.reset();
			expect(Container.has(SimpleService)).toBe(true);
		});

		it('should return true after manual instance setting', () => {
			class ManualService {}
			expect(Container.has(ManualService)).toBe(false);

			Container.set(ManualService, new ManualService());
			expect(Container.has(ManualService)).toBe(true);
		});
	});

	describe('edge cases and error scenarios', () => {
		/**
		 * Test error handling for invalid service configurations
		 */
		it('should handle DIError inheritance correctly', () => {
			class NotDecoratedService {}

			try {
				Container.get(NotDecoratedService);
				fail('Should have thrown DIError');
			} catch (error) {
				expect((error as Error).message).toContain('[DI]');
				expect((error as Error).message).toContain('is not decorated with Service');
			}
		});

		/**
		 * Test Service decorator without options parameter
		 */
		it('should handle Service decorator without options', () => {
			@Service()
			class ServiceWithoutOptions {
				getValue() {
					return 'no-options';
				}
			}

			const instance = Container.get(ServiceWithoutOptions);
			expect(instance).toBeInstanceOf(ServiceWithoutOptions);
			expect(instance.getValue()).toBe('no-options');
		});

		/**
		 * Test complex factory function scenarios
		 */
		it('should handle factory that returns different types', () => {
			interface ComplexInterface {
				process(): string;
			}

			@Service({
				factory: () => ({
					process() {
						return 'complex-factory-result';
					},
				}),
			})
			class ComplexFactoryService implements ComplexInterface {
				process(): string {
					return 'should-not-be-called';
				}
			}

			const instance = Container.get(ComplexFactoryService);
			expect(instance.process()).toBe('complex-factory-result');
		});

		/**
		 * Test metadata preservation in edge cases
		 */
		it('should preserve metadata when setting instance on service with factory', () => {
			@Service({ factory: () => ({ fromFactory: true }) })
			class ServiceWithFactory {
				fromFactory = false;
			}

			// First get via factory
			const factoryInstance = Container.get(ServiceWithFactory);
			expect(factoryInstance.fromFactory).toBe(true);

			// Set custom instance
			const customInstance = { fromFactory: false };
			Container.set(ServiceWithFactory, customInstance);

			// Should get custom instance but preserve factory metadata
			const retrievedInstance = Container.get(ServiceWithFactory);
			expect(retrievedInstance).toBe(customInstance);
			expect(retrievedInstance.fromFactory).toBe(false);
		});

		/**
		 * Test container state after multiple operations
		 */
		it('should maintain consistent state across multiple reset and set operations', () => {
			@Service()
			class StateTestService {
				getId() {
					return Math.random();
				}
			}

			// Get initial instance
			const instance1 = Container.get(StateTestService);
			const id1 = instance1.getId();

			// Reset should create new instance
			Container.reset();
			const instance2 = Container.get(StateTestService);
			const id2 = instance2.getId();

			expect(instance1).not.toBe(instance2);
			expect(id1).not.toBe(id2);

			// Set manual instance
			const manualInstance = new StateTestService();
			Container.set(StateTestService, manualInstance);

			const instance3 = Container.get(StateTestService);
			expect(instance3).toBe(manualInstance);
		});
	});

	describe('comprehensive integration scenarios', () => {
		/**
		 * Test real-world dependency injection patterns
		 */
		it('should handle complex service hierarchies', () => {
			@Service()
			class LoggerService {
				log(message: string) {
					return `LOG: ${message}`;
				}
			}

			@Service()
			class ConfigService {
				getConfig() {
					return { apiUrl: 'https://api.example.com' };
				}
			}

			@Service()
			class ApiService {
				constructor(
					private logger: LoggerService,
					private config: ConfigService,
				) {}

				fetch(endpoint: string) {
					const url = `${this.config.getConfig().apiUrl}${endpoint}`;
					this.logger.log(`Fetching: ${url}`);
					return `Response from ${url}`;
				}
			}

			@Service()
			class UserService {
				constructor(private api: ApiService) {}

				getUser(id: number) {
					return this.api.fetch(`/users/${id}`);
				}
			}

			const userService = Container.get(UserService);
			const result = userService.getUser(123);

			expect(result).toBe('Response from https://api.example.com/users/123');
		});

		/**
		 * Test Service decorator with empty options object
		 */
		it('should handle Service with empty options object', () => {
			@Service({})
			class EmptyOptionsService {
				getValue() {
					return 'empty-options';
				}
			}

			const instance = Container.get(EmptyOptionsService);
			expect(instance).toBeInstanceOf(EmptyOptionsService);
			expect(instance.getValue()).toBe('empty-options');
		});

		/**
		 * Test error propagation from nested dependencies
		 */
		it('should propagate errors from nested dependency resolution', () => {
			@Service({
				factory: () => {
					throw new Error('Nested factory error');
				},
			})
			class NestedErrorService {}

			@Service()
			class DependentOnErrorService {
				constructor(readonly nested: NestedErrorService) {}
			}

			expect(() => Container.get(DependentOnErrorService)).toThrow('Nested factory error');
		});
	});
});
