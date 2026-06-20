import type { ScopedMemoryTaskEvent } from '@n8n/agents';
import type { InstanceAiMemoryTaskSnapshot } from '@n8n/api-types';
import { setTimeout as delay } from 'node:timers/promises';

const MEMORY_TASK_IDLE_POLL_MS = 100;

/**
 * Tracks in-flight observational-memory jobs per conversation thread so eval
 * harnesses can wait for observer/reflector work to settle between user turns.
 */
export class MemoryTaskRegistry {
	private readonly tasksByThread = new Map<string, Map<string, InstanceAiMemoryTaskSnapshot>>();

	handleEvent(threadId: string, event: ScopedMemoryTaskEvent): void {
		const tasks =
			this.tasksByThread.get(threadId) ?? new Map<string, InstanceAiMemoryTaskSnapshot>();
		// Map agents-layer task kinds/status into api-types snapshots for eval visibility.
		const { id, taskKind } = event.task;

		switch (event.type) {
			case 'queued':
				tasks.set(id, { taskId: id, taskKind, status: 'queued' });
				break;
			case 'started':
				tasks.set(id, {
					taskId: id,
					taskKind,
					status: 'running',
					startedAt: event.task.startedAt?.getTime(),
				});
				break;
			case 'completed':
			case 'skipped':
			case 'failed':
				tasks.delete(id);
				break;
		}

		if (tasks.size === 0) {
			this.tasksByThread.delete(threadId);
		} else {
			this.tasksByThread.set(threadId, tasks);
		}
	}

	getTasks(threadId: string): InstanceAiMemoryTaskSnapshot[] {
		return [...(this.tasksByThread.get(threadId)?.values() ?? [])];
	}

	hasPendingTasks(threadId: string): boolean {
		return this.getTasks(threadId).length > 0;
	}

	clearThread(threadId: string): void {
		this.tasksByThread.delete(threadId);
	}

	/**
	 * Block until the in-memory registry is empty and the optional lock probe
	 * reports no active observer/reflector leases. Returns `false` on timeout.
	 */
	async waitUntilIdle(
		threadId: string,
		timeoutMs: number,
		hasActiveLocks?: (observationScopeId: string) => Promise<boolean>,
	): Promise<boolean> {
		const deadline = Date.now() + timeoutMs;

		while (Date.now() < deadline) {
			const registryPending = this.hasPendingTasks(threadId);
			const locksPending = hasActiveLocks ? await hasActiveLocks(threadId) : false;

			if (!registryPending && !locksPending) {
				return true;
			}

			await delay(MEMORY_TASK_IDLE_POLL_MS);
		}

		return (
			!this.hasPendingTasks(threadId) && !(hasActiveLocks ? await hasActiveLocks(threadId) : false)
		);
	}
}
