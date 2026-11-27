import type { AgentMessage } from '@n8n/agents';

// ---------------------------------------------------------------------------
// Eval threads for multi-turn Agent runs (AGENT-1666).
//
// Memory is stripped from eval runs, so the Agent runtime keeps no history of
// its own: the eval service keeps each thread's messages here and replays them
// on the next turn. A "world" is what one simulated user (resource id) shares
// across its threads: the generated seed and the tool mocks it steers, so a
// later session sees the same orders, tickets, and tool catalog.
//
// In process, main mode only (the service refuses queue mode). Entries idle
// for IDLE_TTL_MS are dropped, and each map is capped, so a harness that never
// finishes its threads cannot grow memory without bound.
// ---------------------------------------------------------------------------

const IDLE_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;

export interface EvalAgentThread {
	resourceId: string;
	messages: AgentMessage[];
	/** User messages so far. */
	turns: number;
}

interface Entry<T> {
	value: T;
	lastUsedAt: number;
}

/** A map whose entries expire when idle; when full, the least recently used goes first. */
class IdleMap<T> {
	private readonly entries = new Map<string, Entry<T>>();

	get(key: string, now: number): T | undefined {
		this.evict(now);
		const entry = this.entries.get(key);
		if (!entry) return undefined;
		// Re-insert so iteration order is least recently used first.
		this.entries.delete(key);
		this.entries.set(key, { value: entry.value, lastUsedAt: now });
		return entry.value;
	}

	set(key: string, value: T, now: number): void {
		this.entries.delete(key);
		this.entries.set(key, { value, lastUsedAt: now });
		this.evict(now);
	}

	private evict(now: number): void {
		for (const [key, entry] of this.entries) {
			if (now - entry.lastUsedAt > IDLE_TTL_MS) this.entries.delete(key);
		}
		while (this.entries.size > MAX_ENTRIES) {
			const oldest = this.entries.keys().next().value;
			if (oldest === undefined) break;
			this.entries.delete(oldest);
		}
	}
}

export class EvalAgentThreadStore<World> {
	private readonly worlds = new IdleMap<World>();

	private readonly threads = new IdleMap<EvalAgentThread>();

	constructor(private readonly now: () => number = Date.now) {}

	world(resourceId: string): World | undefined {
		return this.worlds.get(resourceId, this.now());
	}

	saveWorld(resourceId: string, world: World): void {
		this.worlds.set(resourceId, world, this.now());
	}

	thread(threadId: string): EvalAgentThread | undefined {
		return this.threads.get(threadId, this.now());
	}

	saveThread(threadId: string, thread: EvalAgentThread): void {
		this.threads.set(threadId, thread, this.now());
	}
}
