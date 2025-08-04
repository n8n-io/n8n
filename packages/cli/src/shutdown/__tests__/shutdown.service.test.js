'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const shutdown_service_1 = require('../shutdown.service');
class MockComponent {
	onShutdown() {}
}
describe('ShutdownService', () => {
	let shutdownService;
	let mockComponent;
	let onShutdownSpy;
	const errorReporter = (0, jest_mock_extended_1.mock)();
	const shutdownMetadata = di_1.Container.get(decorators_1.ShutdownMetadata);
	beforeEach(() => {
		shutdownMetadata.clear();
		shutdownService = new shutdown_service_1.ShutdownService(
			(0, jest_mock_extended_1.mock)(),
			errorReporter,
			shutdownMetadata,
		);
		mockComponent = new MockComponent();
		di_1.Container.set(MockComponent, mockComponent);
		onShutdownSpy = jest.spyOn(mockComponent, 'onShutdown');
	});
	describe('shutdown', () => {
		it('should signal shutdown', () => {
			shutdownService.register(10, {
				serviceClass: MockComponent,
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
			const order = [];
			const mockService = new MockService();
			di_1.Container.set(MockService, mockService);
			jest.spyOn(mockService, 'onShutdownHighPrio').mockImplementation(() => order.push('high'));
			jest.spyOn(mockService, 'onShutdownLowPrio').mockImplementation(() => order.push('low'));
			shutdownService.register(100, {
				serviceClass: MockService,
				methodName: 'onShutdownHighPrio',
			});
			shutdownService.register(10, {
				serviceClass: MockService,
				methodName: 'onShutdownLowPrio',
			});
			shutdownService.shutdown();
			await shutdownService.waitForShutdown();
			expect(order).toEqual(['high', 'low']);
		});
		it('should throw error if shutdown is already in progress', () => {
			shutdownService.register(10, {
				methodName: 'onShutdown',
				serviceClass: MockComponent,
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
				serviceClass: MockComponent,
				methodName: 'onShutdown',
			});
			shutdownService.shutdown();
			await shutdownService.waitForShutdown();
			expect(errorReporter.error).toHaveBeenCalledTimes(1);
			const error = errorReporter.error.mock.calls[0][0];
			expect(error).toBeInstanceOf(n8n_workflow_1.UnexpectedError);
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
				serviceClass: MockComponent,
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
				serviceClass: MockComponent,
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
				serviceClass: UnregisteredComponent,
				methodName: 'onShutdown',
			});
			expect(() => shutdownService.validate()).toThrow(
				'Component "UnregisteredComponent" is not registered with the DI container. Any component using @OnShutdown() must be decorated with @Service()',
			);
		});
		it('should throw error if component is missing the shutdown method', () => {
			class TestComponent {}
			shutdownService.register(10, {
				serviceClass: TestComponent,
				methodName: 'onShutdown',
			});
			di_1.Container.set(TestComponent, new TestComponent());
			expect(() => shutdownService.validate()).toThrow(
				'Component "TestComponent" does not have a "onShutdown" method',
			);
		});
	});
});
//# sourceMappingURL=shutdown.service.test.js.map
