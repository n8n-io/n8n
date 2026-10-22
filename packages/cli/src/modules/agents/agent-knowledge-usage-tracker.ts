import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import type { AgentRunTelemetryType } from '@/interfaces';
import { Telemetry } from '@/telemetry';

export type KnowledgeToolCall = 'file_find' | 'file_search' | 'file_read' | 'vector_store_search';

/** Counts of one run, named like the "Agent run used knowledge" properties. */
export interface KnowledgeRunUsage {
	file_find_count: number;
	file_search_count: number;
	file_read_count: number;
	vector_store_search_count: number;
}

const usageKeyByCall: Record<KnowledgeToolCall, keyof KnowledgeRunUsage> = {
	file_find: 'file_find_count',
	file_search: 'file_search_count',
	file_read: 'file_read_count',
	vector_store_search: 'vector_store_search_count',
};

/**
 * A run that never ends, for example after a crash, is dropped after this time.
 * It is far longer than any real run, so a long run keeps its counts.
 */
const STALE_RUN_MS = Time.days.toMilliseconds;

/**
 * Counts the knowledge tool calls of each agent run in memory, keyed by the
 * run id of the agent runtime. The runtime is shared between runs, so the run
 * id keeps concurrent runs apart.
 */
@Service()
export class AgentKnowledgeUsageTracker {
	private readonly runs = new Map<string, { usage: KnowledgeRunUsage; lastCallAt: number }>();

	constructor(private readonly telemetry: Telemetry) {}

	sendRunUsage(
		runId: string,
		run: { agentId: string; runType: AgentRunTelemetryType; userId?: string },
	): void {
		const usage = this.takeRunUsage(runId);
		if (!usage) {
			return;
		}

		this.telemetry.track(TELEMETRY_EVENT.AGENTS.AGENT_RUN_USED_KNOWLEDGE, {
			agent_id: run.agentId,
			run_id: runId,
			run_type: run.runType,
			...(run.userId ? { user_id: run.userId } : {}),
			...usage,
		});
	}

	recordToolCall(runId: string | undefined, call: KnowledgeToolCall): void {
		if (!runId) {
			return;
		}

		const now = Date.now();
		this.removeStaleRuns(now);

		const run = this.runs.get(runId) ?? { usage: emptyUsage(), lastCallAt: now };
		run.usage[usageKeyByCall[call]]++;
		run.lastCallAt = now;

		this.runs.set(runId, run);
	}

	/** Returns the counts of the run and forgets the run. Undefined when the run used no knowledge. */
	takeRunUsage(runId: string): KnowledgeRunUsage | undefined {
		const run = this.runs.get(runId);
		this.runs.delete(runId);
		return run?.usage;
	}

	private removeStaleRuns(now: number) {
		for (const [runId, run] of this.runs) {
			if (now - run.lastCallAt > STALE_RUN_MS) {
				this.runs.delete(runId);
			}
		}
	}
}

function emptyUsage(): KnowledgeRunUsage {
	return {
		file_find_count: 0,
		file_search_count: 0,
		file_read_count: 0,
		vector_store_search_count: 0,
	};
}
