import { DuplicateTaskHandlerError } from '../errors';
import type { ClaimedTask } from '../types';

/**
 * Runs one claimed task. Registered against a `taskType`; the executor resolves
 * the handler for a task's type and calls `execute`. A throw means the attempt
 * failed (the executor retries with backoff or marks the task failed).
 */
export interface TaskHandler {
	execute(task: ClaimedTask): Promise<void>;
}

/**
 * Where handlers register themselves by `taskType`. The executor claims only the
 * types present here (`registeredTypes`), so an instance never picks up work it
 * has no handler for.
 */
export class TaskHandlerRegistry {
	private readonly handlers = new Map<string, TaskHandler>();

	/** Register `handler` for `taskType`. Throws if one is already registered. */
	register(taskType: string, handler: TaskHandler): void {
		if (this.handlers.has(taskType)) {
			throw new DuplicateTaskHandlerError(taskType);
		}
		this.handlers.set(taskType, handler);
	}

	resolve(taskType: string): TaskHandler | undefined {
		return this.handlers.get(taskType);
	}

	/** The registered task types, used to scope the claim to runnable work. */
	registeredTypes(): string[] {
		return [...this.handlers.keys()];
	}
}
