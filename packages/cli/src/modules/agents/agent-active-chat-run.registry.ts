import { Service } from '@n8n/di';

/**
 * Index of the agent chat runs currently streaming, so an explicit Stop can
 * abort one.
 *
 * A dropped SSE connection deliberately does not abort a run: the turn keeps
 * going, is recorded, and the client picks it up on reload. Stopping is
 * therefore an explicit request, not a side effect of the socket closing.
 *
 * Keyed per (agent, user) rather than per thread, so it covers the resume path
 * too: there the controller has only a `runId`, and the thread id appears no
 * earlier than the checkpoint load inside `resumeForChat`. The cost is that one
 * user running the same agent in two sessions stops both. Narrowing the key to
 * the thread means carrying it on the resume DTO and on the cancel request —
 * worth doing, but a change to the request contract rather than a cleanup.
 *
 * In-process only. In a multi-main deployment the cancel request can land on an
 * instance that does not hold the run; the run then finishes normally and the
 * client still settles its own view.
 */
@Service()
export class AgentActiveChatRunRegistry {
	private readonly runs = new Map<string, Set<AbortController>>();

	/** Track `controller` as an active run. Returns the disposer for the caller's `finally`. */
	register(agentId: string, userId: string, controller: AbortController): () => void {
		const key = runKey(agentId, userId);
		const controllers = this.runs.get(key) ?? new Set<AbortController>();
		controllers.add(controller);
		this.runs.set(key, controllers);

		return () => {
			const current = this.runs.get(key);
			if (!current) return;
			current.delete(controller);
			if (current.size === 0) this.runs.delete(key);
		};
	}

	/** Abort every run this user has streaming on this agent. */
	cancel(agentId: string, userId: string): boolean {
		const controllers = this.runs.get(runKey(agentId, userId));
		if (controllers === undefined) return false;

		for (const controller of controllers) controller.abort();
		return true;
	}
}

function runKey(agentId: string, userId: string): string {
	return `${agentId}:${userId}`;
}
