import { ApplicationError, ErrorReporterProxy } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';
import type { ServiceClass } from '@/shutdown/Shutdown.service';
import { ShutdownService } from '@/shutdown/Shutdown.service';
import Container from 'typedi';

class MockComponent {
	onShutdown() {}
}

describe('ShutdownService', () => {
	let shutdownService: ShutdownService;
	let mockComponent: MockComponent;
	let onShutdownSpy: jest.SpyInstance;
	let mockErrorReporterProxy: jest.SpyInstance;

	beforeEach(() => {
		shutdownService = new ShutdownService(mock());
		mockComponent = new MockComponent();
		Container.set(MockComponent, mockComponent);
		onShutdownSpy = jest.spyOn(mockComponent, 'onShutdown');
		mockErrorReporterProxy = jest.spyOn(ErrorReporterProxy, 'error').mockImplementation(() => {});
	});

	describe('shutdown', () => {
		it('should signal shutdown', () => {
			shutdownService.register(10, {
				serviceClass: MockComponent as unknown as ServiceClass,
				methodName: 'onShutdown',
			});
			shutdownService.shutdown();
			expect(onShutdownSpy).toBeCalledTimes(1);
		});

		it('should signal shutdown in the priority order', async () => {
			class MockService {
				onShutdownHighPrio() {}

				onShutdownLowPrio() {}
			}

			const order: string[] = [];
			const mockService = new MockService();
			Container.set(MockService, mockService);

			jest.spyOn(mockService, 'onShutdownHighPrio').mockImplementation(() => order.push('high'));
			jest.spyOn(mockService, 'onShutdownLowPrio').mockImplementation(() => order.push('low'));

			shutdownService.register(100, {
				serviceClass: MockService as unknown as ServiceClass,
				methodName: 'onShutdownHighPrio',
			});

			shutdownService.register(10, {
				serviceClass: MockService as unknown as ServiceClass,
				methodName: 'onShutdownLowPrio',
			});

			shutdownService.shutdown();
			await shutdownService.waitForShutdown();
			expect(order).toEqual(['high', 'low']);
		});

		it('should throw error if shutdown is already in progress', () => {
			shutdownService.register(10, {
				methodName: 'onShutdown',
				serviceClass: MockComponent as unknown as ServiceClass,
			});
			shutdownService.shutdown();
			expect(() => shutdownService.shutdown()).toThrow('App is already shutting down');
		});

		it('should report error if component shutdown fails', async () => {
			const componentError = new Error('Something went wrong');
			onShutdownSpy.mockImplementation(() => {
				throw componentError;
			});
			shutdownService.register(10, {
				serviceClass: MockComponent as unknown as ServiceClass,
				methodName: 'onShutdown',
			});
			shutdownService.shutdown();
			await shutdownService.waitForShutdown();

			expect(mockErrorReporterProxy).toHaveBeenCalledTimes(1);
			const error = mockErrorReporterProxy.mock.calls[0][0];
			expect(error).toBeInstanceOf(ApplicationError);
			expect(error.message).toBe('Failed to shutdown gracefully');
			expect(error.extra).toEqual({
				component: 'MockComponent.onShutdown()',
			});
			expect(error.cause).toBe(componentError);
		});
	});

	describe('waitForShutdown', () => {
		it('should wait for shutdown', async () => {
			shutdownService.register(10, {
				serviceClass: MockComponent as unknown as ServiceClass,
				methodName: 'onShutdown',
			});
			shutdownService.shutdown();
			await expect(shutdownService.waitForShutdown()).resolves.toBeUndefined();
		});

		it('should throw error if app is not shutting down', async () => {
			await expect(async () => await shutdownService.waitForShutdown()).rejects.toThrow(
				'App is not shutting down',
			);
		});
	});

	describe('isShuttingDown', () => {
		it('should return true if app is shutting down', () => {
			shutdownService.register(10, {
				serviceClass: MockComponent as unknown as ServiceClass,
				methodName: 'onShutdown',
			});
			shutdownService.shutdown();
			expect(shutdownService.isShuttingDown()).toBe(true);
		});

		it('should return false if app is not shutting down', () => {
			expect(shutdownService.isShuttingDown()).toBe(false);
		});
	});

	describe('validate', () => {
		it('should throw error if component is not registered with the DI container', () => {
			class UnregisteredComponent {
				onShutdown() {}
			}

			shutdownService.register(10, {
				serviceClass: UnregisteredComponent as unknown as ServiceClass,
				methodName: 'onShutdown',
			});

			expect(() => shutdownService.validate()).toThrow(
				'Component "UnregisteredComponent" is not registered with the DI container. Any component using @OnShutdown() must be decorated with @Service()',
			);
		});

		it('should throw error if component is missing the shutdown method', () => {
			class TestComponent {}

			shutdownService.register(10, {
				serviceClass: TestComponent as unknown as ServiceClass,
				methodName: 'onShutdown',
			});

			Container.set(TestComponent, new TestComponent());

			expect(() => shutdownService.validate()).toThrow(
				'Component "TestComponent" does not have a "onShutdown" method',
			);
		});
	});
});
