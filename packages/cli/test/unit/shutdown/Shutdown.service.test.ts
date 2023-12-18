import { ShutdownService, OnShutdown } from '@/shutdown/Shutdown.service';
import { ApplicationError, ErrorReporterProxy } from 'n8n-workflow';

class MockComponent implements OnShutdown {
	onShutdown: OnShutdown['onShutdown'];

	constructor(onAppShutdown?: OnShutdown['onShutdown']) {
		this.onShutdown = onAppShutdown ?? jest.fn();
	}
}

describe('ShutdownService', () => {
	let shutdownService: ShutdownService;
	let mockComponent: OnShutdown;
	let mockErrorReporterProxy: jest.SpyInstance;

	beforeEach(() => {
		shutdownService = new ShutdownService();
		mockComponent = new MockComponent();
		mockErrorReporterProxy = jest.spyOn(ErrorReporterProxy, 'error').mockImplementation(() => {});
	});

	describe('shutdown', () => {
		it('should signal shutdown', () => {
			shutdownService.register(mockComponent);
			shutdownService.shutdown();
			expect(mockComponent.onShutdown).toBeCalledTimes(1);
		});

		it('should throw error if shutdown is already in progress', () => {
			shutdownService.register(mockComponent);
			shutdownService.shutdown();
			expect(() => shutdownService.shutdown()).toThrow('App is already shutting down');
		});

		it('should report error if component shutdown fails', () => {
			const componentError = new Error('Something went wrong');
			mockComponent = new MockComponent(
				jest.fn(() => {
					throw componentError;
				}),
			);
			shutdownService.register(mockComponent);
			shutdownService.shutdown();

			expect(mockErrorReporterProxy).toHaveBeenCalledTimes(1);
			const error = mockErrorReporterProxy.mock.calls[0][0];
			expect(error).toBeInstanceOf(ApplicationError);
			expect(error.message).toBe('Failed to shutdown gracefully');
			expect(error.extra).toEqual({
				component: 'MockComponent',
			});
			expect(error.cause).toBe(componentError);
		});
	});

	describe('waitForShutdown', () => {
		it('should wait for shutdown', async () => {
			shutdownService.register(mockComponent);
			shutdownService.shutdown();
			await expect(shutdownService.waitForShutdown()).resolves.toBeDefined();
		});

		it('should throw error if app is not shutting down', async () => {
			expect(() => shutdownService.waitForShutdown()).rejects.toThrow('App is not shutting down');
		});
	});

	describe('isShuttingDown', () => {
		it('should return true if app is shutting down', () => {
			shutdownService.register(mockComponent);
			shutdownService.shutdown();
			expect(shutdownService.isShuttingDown()).toBe(true);
		});

		it('should return false if app is not shutting down', () => {
			expect(shutdownService.isShuttingDown()).toBe(false);
		});
	});
});
