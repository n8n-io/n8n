import { Service } from '@n8n/di';

/** A queued message can wait behind a running turn. Drop values nobody consumed after this time. */
const HOLD_TTL_MS = 60 * 60 * 1000;

/**
 * Holds editor preview test variables in memory, keyed by queue item ID.
 * The message queue is durable, so the values stay out of it. The consumer
 * takes the values once. A restart or a consumer on another main loses them.
 */
@Service()
export class AgentPreviewTestVariablesService {
	private readonly held = new Map<string, { values: Record<string, string>; expiresAt: number }>();

	hold(queueId: string, values: Record<string, string> | undefined): void {
		const now = Date.now();
		for (const [id, entry] of this.held) if (entry.expiresAt <= now) this.held.delete(id);
		if (!values || Object.keys(values).length === 0) return;
		this.held.set(queueId, { values, expiresAt: now + HOLD_TTL_MS });
	}

	/** Return the values for a queue item and forget them. */
	take(queueId: string): Record<string, string> | undefined {
		const entry = this.held.get(queueId);
		this.held.delete(queueId);
		return entry && entry.expiresAt > Date.now() ? entry.values : undefined;
	}
}
