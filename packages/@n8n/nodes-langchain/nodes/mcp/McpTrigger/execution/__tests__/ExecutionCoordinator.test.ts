import { createMockTool } from '../../__tests__/helpers';
import { DirectExecutionStrategy } from '../DirectExecutionStrategy';
import { ExecutionCoordinator } from '../ExecutionCoordinator';
import { PendingCallsManager } from '../PendingCallsManager';
import { QueuedExecutionStrategy } from '../QueuedExecutionStrategy';

describe('ExecutionCoordinator', () => {
	describe('default behavior', () => {
		it('should use DirectExecutionStrategy by default', () => {
			const coordinator = new ExecutionCoordinator();
			expect(coordinator.getStrategy()).toBeInstanceOf(DirectExecutionStrategy);
		});

		it('should not be in queue mode by default', () => {
			const coordinator = new ExecutionCoordinator();
			expect(coordinator.isQueueMode()).toBe(false);
		});
	});

	describe('constructor with custom strategy', () => {
		it('should accept custom strategy in constructor', () => {
			const customStrategy = new DirectExecutionStrategy();
			const coordinator = new ExecutionCoordinator(customStrategy);
			expect(coordinator.getStrategy()).toBe(customStrategy);
		});

		it('should accept QueuedExecutionStrategy in constructor', () => {
			const queuedStrategy = new QueuedExecutionStrategy(new PendingCallsManager());
			const coordinator = new ExecutionCoordinator(queuedStrategy);
			expect(coordinator.getStrategy()).toBe(queuedStrategy);
			expect(coordinator.isQueueMode()).toBe(true);
		});
	});

	describe('strategy management', () => {
		it('should allow setting custom strategy', () => {
			const coordinator = new ExecutionCoordinator();
			const queuedStrategy = new QueuedExecutionStrategy(new PendingCallsManager());

			coordinator.setStrategy(queuedStrategy);

			expect(coordinator.getStrategy()).toBe(queuedStrategy);
		});

		it('should report queue mode when using QueuedExecutionStrategy', () => {
			const coordinator = new ExecutionCoordinator();
			coordinator.setStrategy(new QueuedExecutionStrategy(new PendingCallsManager()));

			expect(coordinator.isQueueMode()).toBe(true);
		});

		it('should report non-queue mode when switching back to DirectExecutionStrategy', () => {
			const coordinator = new ExecutionCoordinator();
			coordinator.setStrategy(new QueuedExecutionStrategy(new PendingCallsManager()));
			coordinator.setStrategy(new DirectExecutionStrategy());

			expect(coordinator.isQueueMode()).toBe(false);
		});
	});

	describe('executeTool', () => {
		it('should delegate to current strategy', async () => {
			const coordinator = new ExecutionCoordinator();
			const tool = createMockTool('test', { invokeReturn: 'result' });

			const result = await coordinator.executeTool(tool, { input: 'test' }, { sessionId: 's1' });

			expect(tool.invoke).toHaveBeenCalledWith({ input: 'test' });
			expect(result).toBe('result');
		});

		it('should use DirectExecutionStrategy by default', async () => {
			const coordinator = new ExecutionCoordinator();
			const tool = createMockTool('test', { invokeReturn: { data: 'from-tool' } });

			const result = await coordinator.executeTool(tool, {}, { sessionId: 'session-1' });

			expect(result).toEqual({ data: 'from-tool' });
			expect(tool.invoke).toHaveBeenCalled();
		});

		it('should propagate errors from strategy', async () => {
			const coordinator = new ExecutionCoordinator();
			const tool = createMockTool('failing-tool', {
				invokeError: new Error('Strategy error'),
			});

			await expect(coordinator.executeTool(tool, {}, { sessionId: 'session-1' })).rejects.toThrow(
				'Strategy error',
			);
		});

		it('should pass context to strategy', async () => {
			const mockStrategy = {
				executeTool: jest.fn().mockResolvedValue('result'),
			};
			const coordinator = new ExecutionCoordinator(mockStrategy);
			const tool = createMockTool('test', { invokeReturn: 'result' });
			const context = { sessionId: 'session-1', messageId: 'msg-123' };

			await coordinator.executeTool(tool, { arg: 'value' }, context);

			expect(mockStrategy.executeTool).toHaveBeenCalledWith(tool, { arg: 'value' }, context);
		});
	});

	describe('isQueueMode detection', () => {
		it('should detect QueuedExecutionStrategy by constructor name', () => {
			const coordinator = new ExecutionCoordinator();
			const queuedStrategy = new QueuedExecutionStrategy(new PendingCallsManager());

			coordinator.setStrategy(queuedStrategy);

			expect(coordinator.isQueueMode()).toBe(true);
		});

		it('should return false for DirectExecutionStrategy', () => {
			const coordinator = new ExecutionCoordinator(new DirectExecutionStrategy());

			expect(coordinator.isQueueMode()).toBe(false);
		});

		it('should return false for anonymous strategy implementations', () => {
			const coordinator = new ExecutionCoordinator();
			const anonymousStrategy = {
				executeTool: jest.fn().mockResolvedValue('result'),
			};

			coordinator.setStrategy(anonymousStrategy);

			expect(coordinator.isQueueMode()).toBe(false);
		});
	});
});
