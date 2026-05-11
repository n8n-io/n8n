import type { Tool } from '@langchain/core/tools';

import { DirectExecutionStrategy } from './DirectExecutionStrategy';
import type { ExecutionContext, ExecutionStrategy } from './ExecutionStrategy';
import { QueuedExecutionStrategy } from './QueuedExecutionStrategy';

export class ExecutionCoordinator {
	private strategy: ExecutionStrategy;

	constructor(strategy?: ExecutionStrategy) {
		this.strategy = strategy ?? new DirectExecutionStrategy();
	}

	async executeTool(
		tool: Tool,
		args: Record<string, unknown>,
		context: ExecutionContext,
	): Promise<unknown> {
		return await this.strategy.executeTool(tool, args, context);
	}

	setStrategy(strategy: ExecutionStrategy): void {
		this.strategy = strategy;
	}

	getStrategy(): ExecutionStrategy {
		return this.strategy;
	}

	isQueueMode(): boolean {
		return this.strategy instanceof QueuedExecutionStrategy;
	}
}
