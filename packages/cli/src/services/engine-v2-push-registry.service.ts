import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';

import { EngineV2PushSession } from '@/services/engine-v2-push-session';

/** Long enough to outlive a run that idles between steps, e.g. on a wait. */
const SESSION_TTL_MS = 12 * Time.hours.toMilliseconds;

/** Hard ceiling on the map, in case many runs stall inside the TTL. */
const MAX_SESSIONS = 1000;

/**
 * Correlates a data-plane execution id with the editor session that started it.
 *
 * Lifecycle events carry no session id, so the push ref is recorded here at
 * dispatch and read back as events arrive.
 */
@Service()
export class EngineV2PushRegistry {
	private readonly sessions = new Map<string, EngineV2PushSession>();

	register(
		executionId: string,
		init: Pick<EngineV2PushSession, 'pushRef' | 'workflowId' | 'trigger'>,
	): void {
		this.evict();
		this.sessions.set(
			executionId,
			new EngineV2PushSession(init.pushRef, init.workflowId, init.trigger),
		);
	}

	get(executionId: string): EngineV2PushSession | undefined {
		const session = this.sessions.get(executionId);
		if (session) session.lastSeenAt = Date.now();

		return session;
	}

	release(executionId: string): void {
		this.sessions.delete(executionId);
	}

	/**
	 * No `cancelled` event exists, so a session whose terminal event never
	 * arrives would live forever. Swept on write instead of on a timer, so
	 * there's no interval to manage.
	 */
	private evict(): void {
		const cutoff = Date.now() - SESSION_TTL_MS;
		for (const [executionId, session] of this.sessions) {
			if (session.lastSeenAt < cutoff) this.sessions.delete(executionId);
		}

		// Leave room for the caller's session, so the cap holds after the insert.
		const excess = this.sessions.size - MAX_SESSIONS + 1;
		if (excess <= 0) return;

		const oldestFirst = [...this.sessions].sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt);
		for (const [executionId] of oldestFirst.slice(0, excess)) {
			this.sessions.delete(executionId);
		}
	}
}
