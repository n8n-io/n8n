import Container from 'typedi';
import { ShutdownListener } from '@/decorators/ShutdownListener';
import { OnShutdown, ShutdownService } from '@/shutdown/Shutdown.service';

describe('ShutdownListener', () => {
	let shutdownService: ShutdownService;

	beforeEach(() => {
		shutdownService = new ShutdownService();
		Container.set(ShutdownService, shutdownService);
		jest.spyOn(shutdownService, 'register');
	});

	it('should register a class that implements OnShutdown', () => {
		@ShutdownListener()
		class TestClass implements OnShutdown {
			async onShutdown() {
				// Will be called when the app is shutting down
			}
		}

		const testClass = new TestClass();
		expect(shutdownService.register).toHaveBeenCalledTimes(1);
		expect(shutdownService.register).toHaveBeenCalledWith('TestClass', testClass);
	});

	it('should throw an error if the class does not implement onShutdown', () => {
		expect(() => {
			// @ts-expect-error Testing invalid code
			@ShutdownListener()
			class TestClass {}

			new TestClass();
		}).toThrow(`Class "TestClass" must implement "onShutdown" method`);
	});
});
