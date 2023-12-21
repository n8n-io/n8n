import Container from 'typedi';
import { OnShutdown } from '@/decorators/OnShutdown';
import { ShutdownService } from '@/shutdown/Shutdown.service';
import { MockLogger } from '../../shared/MockLogger';

describe('OnShutdown', () => {
	let shutdownService: ShutdownService;
	let registerSpy: jest.SpyInstance;

	beforeEach(() => {
		shutdownService = new ShutdownService(new MockLogger());
		Container.set(ShutdownService, shutdownService);
		registerSpy = jest.spyOn(shutdownService, 'register');
	});

	it('should register a methods that is decorated with OnShutdown', () => {
		class TestClass {
			@OnShutdown()
			async onShutdown() {}
		}

		new TestClass();
		expect(shutdownService.register).toHaveBeenCalledTimes(1);
		expect(shutdownService.register).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'TestClass.onShutdown()',
				hook: expect.any(Function),
				priority: undefined,
			}),
		);
	});

	it('should register multiple methods in the same class', () => {
		class TestClass {
			@OnShutdown()
			async one() {}

			@OnShutdown()
			async two() {}
		}

		const testClass = new TestClass();
		expect(shutdownService.register).toHaveBeenCalledTimes(2);
		expect(shutdownService.register).toHaveBeenCalledWith({
			name: 'TestClass.one()',
			hook: testClass.one,
			priority: undefined,
		});
		expect(shutdownService.register).toHaveBeenCalledWith({
			name: 'TestClass.two()',
			hook: testClass.two,
			priority: undefined,
		});
	});

	it('binds this correctly', () => {
		let thisArg: TestClass | undefined;
		class TestClass {
			@OnShutdown()
			async onShutdown() {
				// eslint-disable-next-line @typescript-eslint/no-this-alias
				thisArg = this;
			}
		}

		const testClass = new TestClass();
		shutdownService.shutdown();
		expect(thisArg).toBe(testClass);
	});

	it('should use the given priority', () => {
		class TestClass {
			@OnShutdown({ priority: 10 })
			async onShutdown() {
				// Will be called when the app is shutting down
			}
		}

		new TestClass();
		expect(shutdownService.register).toHaveBeenCalledTimes(1);
		expect(shutdownService.register).toHaveBeenCalledWith(
			expect.objectContaining({
				priority: 10,
			}),
		);
	});

	it('should throw an error if the decorated member is not a function', () => {
		expect(() => {
			class TestClass {
				// @ts-expect-error Testing invalid code
				@OnShutdown()
				onShutdown = 'not a function';
			}

			new TestClass();
		}).toThrow('TestClass.onShutdown() must be a method to use "OnShutdown"');
	});
});
