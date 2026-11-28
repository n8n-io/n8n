import type { AgentMessage } from '@n8n/agents';

// ---------------------------------------------------------------------------
// Eval threads for multi-turn Agent runs (AGENT-1666).
//
// With memory stripped (the default), the Agent runtime keeps no history of
// its own: the eval service keeps each thread's messages here and replays them
// on the next turn. With memory kept (`agentRun.keepMemory`), the runtime's
// own thread memory holds the history instead (see `planThreadTurn`). A "world" is what one simulated user (resource id) shares
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
	/** The Agent and n8n user the thread was opened for. */
	agentId: string;
	userId: string;
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

	deleteWhere(matches: (value: T, key: string) => boolean): void {
		for (const [key, entry] of this.entries) {
			if (matches(entry.value, key)) this.entries.delete(key);
		}
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

	/** Forget a simulated user: its world and every thread it has. */
	dropResource(resourceId: string): void {
		this.worlds.deleteWhere((_world, key) => key === resourceId);
		this.threads.deleteWhere((thread) => thread.resourceId === resourceId);
	}
}

/** What a thread turn sends the Agent, and whether the eval keeps the history. */
export interface ThreadTurnPlan {
	input: AgentMessage[];
	/** Set when memory is on: the runtime loads and stores the thread itself. */
	persistence?: { threadId: string; resourceId: string };
	/** False when memory is on: replaying would duplicate history and hide compaction. */
	keepsHistory: boolean;
}

/**
 * Memory off: replay the thread's stored messages before the new one. Memory
 * on: send only the new message, with the thread and resource ids, so the
 * runtime's own memory (history, observations, episodic recall) is what the
 * Agent sees, as in a real chat.
 */
export function planThreadTurn(args: {
	memoryOn: boolean;
	threadId: string;
	resourceId: string;
	history: AgentMessage[];
	userMessage: string;
}): ThreadTurnPlan {
	const message: AgentMessage = {
		role: 'user',
		content: [{ type: 'text', text: args.userMessage }],
	};
	if (!args.memoryOn) return { input: [...args.history, message], keepsHistory: true };
	const { threadId, resourceId } = args;
	return { input: [message], persistence: { threadId, resourceId }, keepsHistory: false };
}
