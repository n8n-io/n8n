import { Container, Service } from '@n8n/di';

import { OnShutdown } from '../on-shutdown';
import { ShutdownMetadata } from '../shutdown-metadata';

describe('OnShutdown', () => {
	let shutdownMetadata: ShutdownMetadata;

	beforeEach(() => {
		shutdownMetadata = new ShutdownMetadata();
		Container.set(ShutdownMetadata, shutdownMetadata);
		jest.spyOn(shutdownMetadata, 'register');
	});

	it('should register a methods that is decorated with OnShutdown', () => {
		@Service()
		class TestClass {
			@OnShutdown()
			async onShutdown() {}
		}

		expect(shutdownMetadata.register).toHaveBeenCalledTimes(1);
		expect(shutdownMetadata.register).toHaveBeenCalledWith(100, {
			methodName: 'onShutdown',
			serviceClass: TestClass,
		});
	});

	it('should register multiple methods in the same class', () => {
		@Service()
		class TestClass {
			@OnShutdown()
			async one() {}

			@OnShutdown()
			async two() {}
		}

		expect(shutdownMetadata.register).toHaveBeenCalledTimes(2);
		expect(shutdownMetadata.register).toHaveBeenCalledWith(100, {
			methodName: 'one',
			serviceClass: TestClass,
		});
		expect(shutdownMetadata.register).toHaveBeenCalledWith(100, {
			methodName: 'two',
			serviceClass: TestClass,
		});
	});

	it('should use the given priority', () => {
		// @ts-expect-error We are checking the decorator.
		class TestClass {
			@OnShutdown(10)
			async onShutdown() {
				// Will be called when the app is shutting down
			}
		}

		expect(shutdownMetadata.register).toHaveBeenCalledTimes(1);
		// @ts-expect-error We are checking internal parts of the shutdown service
		expect(shutdownMetadata.handlersByPriority[10].length).toEqual(1);
	});

	it('should throw an error if the decorated member is not a function', () => {
		expect(() => {
			@Service()
			class TestClass {
				// @ts-expect-error Testing invalid code
				@OnShutdown()
				onShutdown = 'not a function';
			}

			new TestClass();
		}).toThrow('TestClass.onShutdown() must be a method on TestClass to use "OnShutdown"');
	});

	it('should throw if the priority is invalid', () => {
		expect(() => {
			@Service()
			class TestClass {
				@OnShutdown(201)
				async onShutdown() {}
			}

			new TestClass();
		}).toThrow('Invalid shutdown priority. Please set it between 0 and 200.');

		expect(() => {
			@Service()
			class TestClass {
				@OnShutdown(-1)
				async onShutdown() {}
			}

			new TestClass();
		}).toThrow('Invalid shutdown priority. Please set it between 0 and 200.');
	});
});
