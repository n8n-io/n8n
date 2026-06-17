import type { Logger } from 'n8n-workflow';

import { DirectExecutionStrategy, QueuedExecutionStrategy } from './execution';
import type { ToolInvocationSender } from './execution';

/**
 * Simplified coordinator that helps detect deployment mode and create strategies.
 *
 * IMPORTANT: This class does NOT handle any network communication (PubSub, Redis, etc).
 * All network wiring is handled externally in packages/cli/src/scaling/scaling.service.ts
 * to respect workspace boundaries (nodes-langchain cannot import from cli).
 *
 * This class provides:
 * 1. Mode detection helper
 * 2. Strategy factory methods
 * 3. Type-safe interfaces for external wiring
 */
export class ToolExecutionCoordinator {
	/**
	 * Detects if running in queue mode based on instance type.
	 *
	 * @param instanceType The n8n instance type ('main', 'worker', 'webhook')
	 * @returns true if queue mode should be used
	 */
	static isQueueMode(instanceType: 'main' | 'worker' | 'webhook'): boolean {
		return instanceType === 'worker';
	}

	/**
	 * Creates a DirectExecutionStrategy for single-instance mode.
	 */
	static createDirectStrategy(): DirectExecutionStrategy {
		return new DirectExecutionStrategy();
	}

	/**
	 * Creates a QueuedExecutionStrategy for distributed mode.
	 *
	 * The caller MUST provide the sendToolInvocation callback that handles
	 * network communication (e.g., Redis pubsub, Bull queue progress, etc).
	 *
	 * @param logger Logger instance
	 * @param sendToolInvocation Callback to send tool invocation requests over the network
	 * @param sessionId Optional MCP session ID
	 * @param timeoutMs Timeout for tool invocations (default 30 seconds)
	 */
	static createQueuedStrategy(
		logger: Logger,
		sendToolInvocation: ToolInvocationSender,
		sessionId?: string,
		timeoutMs: number = 30000,
	): QueuedExecutionStrategy {
		return new QueuedExecutionStrategy(logger, sendToolInvocation, sessionId, timeoutMs);
	}
}
