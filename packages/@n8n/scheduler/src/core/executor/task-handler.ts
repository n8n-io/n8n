import { DuplicateTaskHandlerError } from '../errors';
import type { ClaimedTask } from '../types';

/**
 * Runs one claimed task. Registered against a `taskType`; the executor resolves
 * the handler for a task's type and calls `execute`. A throw means the attempt
 * failed (the executor retries with backoff or marks the task failed).
 *
 * `onDispatch` lets the handler tell the executor the instant its effect was
 * actually handed off (e.g. the workflow execution was created and started).
 * The executor records that as the task's dispatch marker, which the reaper uses
 * to avoid recording an occurrence that did run as failed. Call it once, exactly
 * when the effect becomes real: not before, and not when a redelivery finds the
 * effect already exists. Handlers that never dispatch simply never call it.
 */
export interface TaskHandler {
	execute(task: ClaimedTask, onDispatch: () => void): Promise<void>;
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
