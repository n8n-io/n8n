import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { TaskBrokerAuthService } from '@/task-runners/task-broker/auth/task-broker-auth.service';
import { TaskRunnerLifecycleEvents } from '@/task-runners/task-runner-lifecycle-events';
import { JsTaskRunnerProcess } from '@/task-runners/task-runner-process-js';
import { PyTaskRunnerProcess } from '@/task-runners/task-runner-process-py';

/**
 * Tests to verify that task runner processes cannot be created or started in external mode.
 * This prevents the phantom runner bug (issue #25544) where internal runners would spawn
 * in external mode and cause 403 authentication errors.
 */
describe('TaskRunnerProcess in external mode', () => {
	const runnerConfig = Container.get(TaskRunnersConfig);

	beforeEach(() => {
		runnerConfig.mode = 'external';
		runnerConfig.enabled = true;
		runnerConfig.authToken = 'test-token';
		runnerConfig.port = 5679;
	});

	afterEach(() => {
		// Reset to internal mode to avoid affecting other tests
		runnerConfig.mode = 'internal';
	});

	describe('JsTaskRunnerProcess', () => {
		it('should throw assertion error when instantiated in external mode', () => {
			// Act & Assert
			expect(() => Container.get(JsTaskRunnerProcess)).toThrow(
				'JsTaskRunnerProcess cannot be used in external mode',
			);
		});
	});

	describe('PyTaskRunnerProcess', () => {
		it('should throw assertion error when instantiated in external mode', () => {
			// Act & Assert
			expect(() => Container.get(PyTaskRunnerProcess)).toThrow(
				'PyTaskRunnerProcess cannot be used in external mode',
			);
		});
	});

	describe('Lifecycle event handlers', () => {
		it('should not register lifecycle event handlers in external mode', () => {
			// Arrange
			const logger = Container.get(Logger);
			const authService = Container.get(TaskBrokerAuthService);
			const lifecycleEvents = Container.get(TaskRunnerLifecycleEvents);

			// Verify no listeners are registered before
			const initialListenerCount = lifecycleEvents.listenerCount('runner:failed-heartbeat-check');

			// Act - Try to create a runner process in external mode
			// This should fail at the constructor assertion
			expect(() => {
				new JsTaskRunnerProcess(logger, runnerConfig, authService, lifecycleEvents);
			}).toThrow('JsTaskRunnerProcess cannot be used in external mode');

			// Assert - Verify no listeners were registered
			expect(lifecycleEvents.listenerCount('runner:failed-heartbeat-check')).toBe(
				initialListenerCount,
			);
			expect(lifecycleEvents.listenerCount('runner:timed-out-during-task')).toBe(0);
		});

		it('should register lifecycle event handlers in internal mode', () => {
			// Arrange
			runnerConfig.mode = 'internal';
			const logger = Container.get(Logger);
			const authService = Container.get(TaskBrokerAuthService);
			const lifecycleEvents = new TaskRunnerLifecycleEvents();

			// Verify no listeners initially
			expect(lifecycleEvents.listenerCount('runner:failed-heartbeat-check')).toBe(0);
			expect(lifecycleEvents.listenerCount('runner:timed-out-during-task')).toBe(0);

			// Act - Create a runner process in internal mode
			const jsRunner = new JsTaskRunnerProcess(logger, runnerConfig, authService, lifecycleEvents);

			// Assert - Verify listeners were registered
			expect(lifecycleEvents.listenerCount('runner:failed-heartbeat-check')).toBe(1);
			expect(lifecycleEvents.listenerCount('runner:timed-out-during-task')).toBe(1);

			// Cleanup
			jsRunner.removeAllListeners();
		});
	});

	describe('Start method guards', () => {
		it('should prevent starting runner process in external mode', async () => {
			// Arrange
			runnerConfig.mode = 'internal';
			const logger = Container.get(Logger);
			const authService = Container.get(TaskBrokerAuthService);
			const lifecycleEvents = Container.get(TaskRunnerLifecycleEvents);

			const jsRunner = new JsTaskRunnerProcess(logger, runnerConfig, authService, lifecycleEvents);

			// Switch to external mode after instantiation (simulating race condition)
			runnerConfig.mode = 'external';

			// Act & Assert
			await expect(jsRunner.start()).rejects.toThrow(
				'Cannot start runnner:js in external mode - task runners should be managed externally',
			);

			// Cleanup
			runnerConfig.mode = 'internal';
		});
	});

	describe('Restart guards', () => {
		it('should prevent force restart in external mode', async () => {
			// Arrange
			runnerConfig.mode = 'internal';
			const logger = Container.get(Logger);
			const authService = Container.get(TaskBrokerAuthService);
			const lifecycleEvents = Container.get(TaskRunnerLifecycleEvents);

			const jsRunner = new JsTaskRunnerProcess(logger, runnerConfig, authService, lifecycleEvents);

			// Start the runner in internal mode
			await jsRunner.start();

			// Switch to external mode (simulating race condition)
			runnerConfig.mode = 'external';

			// Spy on logger to verify error is logged
			const loggerErrorSpy = jest.spyOn(logger, 'error');

			// Act - Try to force restart
			// @ts-expect-error - accessing protected method for testing
			await jsRunner.forceRestart();

			// Assert - Verify error was logged and process was not restarted
			expect(loggerErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Attempted to restart task runner in external mode'),
			);

			// Cleanup
			runnerConfig.mode = 'internal';
			await jsRunner.stop();
		});
	});

	describe('Process exit guards', () => {
		it('should not auto-restart on process exit in external mode', async () => {
			// Arrange
			runnerConfig.mode = 'internal';
			const logger = Container.get(Logger);
			const authService = Container.get(TaskBrokerAuthService);
			const lifecycleEvents = Container.get(TaskRunnerLifecycleEvents);

			const jsRunner = new JsTaskRunnerProcess(logger, runnerConfig, authService, lifecycleEvents);

			// Start the runner in internal mode
			await jsRunner.start();

			const originalPid = jsRunner.pid;

			// Switch to external mode (simulating race condition)
			runnerConfig.mode = 'external';

			// Spy on logger to verify error is logged
			const loggerErrorSpy = jest.spyOn(logger, 'error');

			// Act - Kill the process to trigger exit handler
			// @ts-expect-error - accessing private property for testing
			jsRunner.process?.kill('SIGKILL');

			// Wait for process to exit
			await jsRunner.runPromise;

			// Wait a bit to ensure no restart happens
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Assert - Verify error was logged and process was not restarted
			expect(loggerErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('Task runner process exited in external mode'),
			);
			expect(jsRunner.isRunning).toBe(false);
			expect(jsRunner.pid).toBeUndefined();

			// Cleanup
			runnerConfig.mode = 'internal';
		});
	});
});
