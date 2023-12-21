import { ApplicationError, ErrorReporterProxy } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';
import { ShutdownService } from '@/shutdown/Shutdown.service';

class MockComponent {
	onShutdown() {}
}

describe.skip('ShutdownService', () => {
	let shutdownService: ShutdownService;
	let mockComponent: MockComponent;
	let mockErrorReporterProxy: jest.SpyInstance;

	const componentName = MockComponent.name;

	beforeEach(() => {
		shutdownService = new ShutdownService(mock());
		mockComponent = new MockComponent();
		mockErrorReporterProxy = jest.spyOn(ErrorReporterProxy, 'error').mockImplementation(() => {});
	});

	describe('shutdown', () => {
		it('should signal shutdown', () => {
			shutdownService.register(10, {
				serviceClass: MockComponent,
				methodName: 'onShutdown',
			});
			shutdownService.shutdown();
			expect(mockComponent.onShutdown).toBeCalledTimes(1);
		});

		it('should signal shutdown in the priority order', async () => {
			const order: string[] = [];
			const highPrio = jest.fn().mockImplementation(() => order.push('high'));
			const lowPrio = jest.fn().mockImplementation(() => order.push('low'));

			shutdownService.register(0, {
				name: componentName,
				hook: lowPrio,
				priority: 0,
			});
			shutdownService.register(10, {
				name: componentName,
				hook: highPrio,
				priority: 10,
			});

			shutdownService.shutdown();
			await shutdownService.waitForShutdown();
			expect(order).toEqual(['high', 'low']);
		});

		it('should throw error if shutdown is already in progress', () => {
			shutdownService.register({
				name: componentName,
				hook: mockComponent.onShutdown,
			});
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
			shutdownService.register({
				name: componentName,
				hook: mockComponent.onShutdown,
			});
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
			shutdownService.register({
				name: componentName,
				hook: mockComponent.onShutdown,
			});
			shutdownService.shutdown();
			await expect(shutdownService.waitForShutdown()).resolves.toBeUndefined();
		});

		it('should throw error if app is not shutting down', async () => {
			await expect(async () => shutdownService.waitForShutdown()).rejects.toThrow(
				'App is not shutting down',
			);
		});
	});

	describe('isShuttingDown', () => {
		it('should return true if app is shutting down', () => {
			shutdownService.register({
				name: componentName,
				hook: mockComponent.onShutdown,
			});
			shutdownService.shutdown();
			expect(shutdownService.isShuttingDown()).toBe(true);
		});

		it('should return false if app is not shutting down', () => {
			expect(shutdownService.isShuttingDown()).toBe(false);
		});
	});
});
