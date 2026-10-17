import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';

/** Minimum hold time, used when the configured checkpoint TTL is shorter or invalid. */
const MIN_HOLD_TTL_MS = 60 * 60 * 1000;

/**
 * Holds editor preview test variables in memory, keyed by queue item ID.
 * The message queue is durable, so the values stay out of it. The consumer
 * takes the values once. A restart or a consumer on another main loses them.
 */
@Service()
export class AgentPreviewTestVariablesService {
	private readonly held = new Map<string, { values: Record<string, string>; expiresAt: number }>();

	constructor(private readonly agentsConfig: AgentsConfig) {}

	/**
	 * A queued message can wait behind a suspended run. That run lives as long as
	 * its checkpoint, so hold the values at least that long.
	 */
	private get holdTtlMs(): number {
		const checkpointMs = this.agentsConfig.checkpointTtlSeconds * Time.seconds.toMilliseconds;
		return Math.max(MIN_HOLD_TTL_MS, Number.isFinite(checkpointMs) ? checkpointMs : 0);
	}

	hold(queueId: string, values: Record<string, string> | undefined): void {
		const now = Date.now();
		for (const [id, entry] of this.held) if (entry.expiresAt <= now) this.held.delete(id);
		if (!values || Object.keys(values).length === 0) return;
		this.held.set(queueId, { values, expiresAt: now + this.holdTtlMs });
	}

	/** Return the values for a queue item and forget them. */
	take(queueId: string): Record<string, string> | undefined {
		const entry = this.held.get(queueId);
		this.held.delete(queueId);
		return entry && entry.expiresAt > Date.now() ? entry.values : undefined;
	}
}
