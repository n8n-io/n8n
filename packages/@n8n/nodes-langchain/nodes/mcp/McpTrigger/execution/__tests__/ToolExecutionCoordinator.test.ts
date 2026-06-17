import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { Logger } from 'n8n-workflow';

import { ToolExecutionCoordinator } from '../../ToolExecutionCoordinator';
import { DirectExecutionStrategy } from '../DirectExecutionStrategy';
import { QueuedExecutionStrategy } from '../QueuedExecutionStrategy';

describe('ToolExecutionCoordinator', () => {
	describe('isQueueMode', () => {
		it('should return true for worker instance type', () => {
			expect(ToolExecutionCoordinator.isQueueMode('worker')).toBe(true);
		});

		it('should return false for main instance type', () => {
			expect(ToolExecutionCoordinator.isQueueMode('main')).toBe(false);
		});

		it('should return false for webhook instance type', () => {
			expect(ToolExecutionCoordinator.isQueueMode('webhook')).toBe(false);
		});
	});

	describe('createDirectStrategy', () => {
		it('should create a DirectExecutionStrategy instance', () => {
			const strategy = ToolExecutionCoordinator.createDirectStrategy();

			expect(strategy).toBeInstanceOf(DirectExecutionStrategy);
		});

		it('should create a new instance each time', () => {
			const strategy1 = ToolExecutionCoordinator.createDirectStrategy();
			const strategy2 = ToolExecutionCoordinator.createDirectStrategy();

			expect(strategy1).not.toBe(strategy2);
		});
	});

	describe('createQueuedStrategy', () => {
		const mockLogger = mock<Logger>();
		const mockSendToolInvocation = vi.fn();
		const sessionId = 'test-session-id';
		const timeoutMs = 15000;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should create a QueuedExecutionStrategy instance with required parameters', () => {
			const strategy = ToolExecutionCoordinator.createQueuedStrategy(
				mockLogger,
				mockSendToolInvocation,
			);

			expect(strategy).toBeInstanceOf(QueuedExecutionStrategy);
		});

		it('should create a QueuedExecutionStrategy with session ID', () => {
			const strategy = ToolExecutionCoordinator.createQueuedStrategy(
				mockLogger,
				mockSendToolInvocation,
				sessionId,
			);

			expect(strategy).toBeInstanceOf(QueuedExecutionStrategy);
		});

		it('should create a QueuedExecutionStrategy with custom timeout', () => {
			const strategy = ToolExecutionCoordinator.createQueuedStrategy(
				mockLogger,
				mockSendToolInvocation,
				sessionId,
				timeoutMs,
			);

			expect(strategy).toBeInstanceOf(QueuedExecutionStrategy);
		});

		it('should use default timeout when not specified', () => {
			const strategy = ToolExecutionCoordinator.createQueuedStrategy(
				mockLogger,
				mockSendToolInvocation,
				sessionId,
			);

			expect(strategy).toBeInstanceOf(QueuedExecutionStrategy);
		});

		it('should create a new instance each time', () => {
			const strategy1 = ToolExecutionCoordinator.createQueuedStrategy(
				mockLogger,
				mockSendToolInvocation,
			);
			const strategy2 = ToolExecutionCoordinator.createQueuedStrategy(
				mockLogger,
				mockSendToolInvocation,
			);

			expect(strategy1).not.toBe(strategy2);
		});
	});
});
