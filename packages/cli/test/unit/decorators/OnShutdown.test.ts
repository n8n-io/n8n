import Container, { Service } from 'typedi';
import { OnShutdown } from '@/decorators/OnShutdown';
import { ShutdownService } from '@/shutdown/Shutdown.service';
import { mock } from 'jest-mock-extended';

describe('OnShutdown', () => {
	let shutdownService: ShutdownService;

	beforeEach(() => {
		shutdownService = new ShutdownService(mock());
		Container.set(ShutdownService, shutdownService);
		jest.spyOn(shutdownService, 'register');
	});

	it('should register a methods that is decorated with OnShutdown', () => {
		@Service()
		class TestClass {
			@OnShutdown()
			async onShutdown() {}
		}

		expect(shutdownService.register).toHaveBeenCalledTimes(1);
		expect(shutdownService.register).toHaveBeenCalledWith(100, {
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

		expect(shutdownService.register).toHaveBeenCalledTimes(2);
		expect(shutdownService.register).toHaveBeenCalledWith(100, {
			methodName: 'one',
			serviceClass: TestClass,
		});
		expect(shutdownService.register).toHaveBeenCalledWith(100, {
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

		expect(shutdownService.register).toHaveBeenCalledTimes(1);
		// @ts-expect-error We are checking internal parts of the shutdown service
		expect(shutdownService.handlersByPriority[10].length).toEqual(1);
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
});
