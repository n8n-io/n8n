import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';

/**
 * Abort reason for a run this process tore down on its way out. It marks the
 * abort as "nobody asked for this", so the run keeps the error it raised
 * instead of being recorded as a clean cancel — see
 * `normalizeAbortedMessageRecord`.
 */
export const CHAT_RUN_INTERRUPTED_BY_SHUTDOWN = 'chat-run-interrupted-by-shutdown';

/** Identifies one streaming chat run: a thread, plus who is allowed to stop it. */
export interface ActiveChatRunKey {
	agentId: string;
	userId: string;
	threadId: string;
}

/**
 * Index of the agent chat runs currently streaming, so an explicit Stop can
 * abort one.
 *
 * A dropped SSE connection deliberately does not abort a run: the turn keeps
 * going, is recorded, and the client picks it up on reload. Stopping is
 * therefore an explicit request, not a side effect of the socket closing.
 *
 * The key carries the thread so that stopping one conversation leaves the
 * user's other conversations with the same agent running. It carries the user
 * because a thread has no recorded owner yet, and the caller's own id is what
 * keeps one user from stopping another's run.
 *
 * In-process only. In a multi-main deployment the cancel request can land on an
 * instance that does not hold the run; the run then finishes normally and the
 * client still settles its own view.
 */
@Service()
export class AgentActiveChatRunRegistry {
	private readonly runs = new Map<string, Set<AbortController>>();

	/** Track `controller` as an active run. Returns the disposer for the caller's `finally`. */
	register(key: ActiveChatRunKey, controller: AbortController): () => void {
		const runKey = toRunKey(key);
		const controllers = this.runs.get(runKey) ?? new Set<AbortController>();
		controllers.add(controller);
		this.runs.set(runKey, controllers);

		return () => {
			const current = this.runs.get(runKey);
			if (!current) return;
			current.delete(controller);
			if (current.size === 0) this.runs.delete(runKey);
		};
	}

	/**
	 * Abort the runs streaming on this thread for this user. More than one can be
	 * registered — a resumed turn overlaps the turn it continues — and they all
	 * belong to the conversation being stopped.
	 */
	cancel(key: ActiveChatRunKey): boolean {
		const controllers = this.runs.get(toRunKey(key));
		if (controllers === undefined) return false;

		for (const controller of controllers) controller.abort();
		return true;
	}

	/**
	 * Tear down every run still streaming when the process stops. Without this a
	 * rolling update leaves them mid-turn, and the row stays `running` until the
	 * interrupted-execution sweep notices minutes later. Aborting here lets each
	 * run persist what it produced, and the reason keeps its error intact so the
	 * turn reads as failed rather than as something the user cancelled.
	 */
	@OnShutdown()
	abortAll(): void {
		for (const controllers of this.runs.values()) {
			for (const controller of controllers) controller.abort(CHAT_RUN_INTERRUPTED_BY_SHUTDOWN);
		}
	}
}

function toRunKey({ agentId, userId, threadId }: ActiveChatRunKey): string {
	return `${agentId}:${userId}:${threadId}`;
}
