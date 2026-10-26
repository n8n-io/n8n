import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import type { AgentRunTelemetryType } from '@/interfaces';
import { Telemetry } from '@/telemetry';

export type KnowledgeToolCall = 'file_find' | 'file_search' | 'file_read' | 'vector_store_search';

/**
 * A failed call sends no knowledge content, so it has no characters to count.
 * `fileUploadedAt` is the upload time of the file that a successful read used.
 */
export type KnowledgeToolCallResult =
	| { failed: false; contentChars: number; fileUploadedAt?: string }
	| { failed: true };

export type FinishKnowledgeToolCall = (result: KnowledgeToolCallResult) => void;

/** Counts of one run, named like the "Agent run used knowledge" properties. */
export interface KnowledgeRunUsage {
	file_find_count: number;
	file_search_count: number;
	file_read_count: number;
	vector_store_search_count: number;
	file_content_chars: number;
	vector_store_content_chars: number;
	file_failed_count: number;
	vector_store_failed_count: number;
}

const usageKeyByCall: Record<KnowledgeToolCall, keyof KnowledgeRunUsage> = {
	file_find: 'file_find_count',
	file_search: 'file_search_count',
	file_read: 'file_read_count',
	vector_store_search: 'vector_store_search_count',
};

const contentKeyByCall: Record<KnowledgeToolCall, keyof KnowledgeRunUsage> = {
	file_find: 'file_content_chars',
	file_search: 'file_content_chars',
	file_read: 'file_content_chars',
	vector_store_search: 'vector_store_content_chars',
};

const failedKeyByCall: Record<KnowledgeToolCall, keyof KnowledgeRunUsage> = {
	file_find: 'file_failed_count',
	file_search: 'file_failed_count',
	file_read: 'file_failed_count',
	vector_store_search: 'vector_store_failed_count',
};

/**
 * A run that never ends, for example after a crash, is dropped after this time.
 * It is far longer than any real run, so a long run keeps its counts.
 */
const STALE_RUN_MS = Time.days.toMilliseconds;

interface TrackedRun {
	usage: KnowledgeRunUsage;
	lastCallAt: number;
	newestFileUploadedAt?: number;
	oldestFileUploadedAt?: number;
}

/**
 * Counts the knowledge tool calls of each agent run in memory, keyed by the
 * run id of the agent runtime. The runtime is shared between runs, so the run
 * id keeps concurrent runs apart.
 */
@Service()
export class AgentKnowledgeUsageTracker {
	private readonly runs = new Map<string, TrackedRun>();

	constructor(private readonly telemetry: Telemetry) {}

	sendRunUsage(
		runId: string,
		run: { agentId: string; runType: AgentRunTelemetryType; userId?: string },
	): void {
		const trackedRun = this.takeRun(runId);
		if (!trackedRun) {
			return;
		}

		this.telemetry.track(TELEMETRY_EVENT.AGENTS.AGENT_RUN_USED_KNOWLEDGE, {
			agent_id: run.agentId,
			run_id: runId,
			run_type: run.runType,
			...(run.userId ? { user_id: run.userId } : {}),
			...trackedRun.usage,
			...fileAges(trackedRun, Date.now()),
		});
	}

	/**
	 * Counts the call when it starts, so a stopped run still counts it.
	 * The returned function adds the result of the call when it ends.
	 */
	startToolCall(runId: string | undefined, call: KnowledgeToolCall): FinishKnowledgeToolCall {
		if (!runId) {
			return () => {};
		}

		const now = Date.now();
		this.removeStaleRuns(now);

		const run: TrackedRun = this.runs.get(runId) ?? { usage: emptyUsage(), lastCallAt: now };
		run.usage[usageKeyByCall[call]]++;
		run.lastCallAt = now;
		this.runs.set(runId, run);

		return (result) => {
			// Make sure a result that arrives after its run ended joins no event.
			if (this.runs.get(runId) !== run) {
				return;
			}

			if (result.failed) {
				run.usage[failedKeyByCall[call]]++;
			} else {
				run.usage[contentKeyByCall[call]] += result.contentChars;
				if (result.fileUploadedAt) {
					recordFileUploadedAt(run, Date.parse(result.fileUploadedAt));
				}
			}

			run.lastCallAt = Date.now();
		};
	}

	/** Returns the counts of the run and forgets the run. Undefined when the run used no knowledge. */
	takeRunUsage(runId: string): KnowledgeRunUsage | undefined {
		return this.takeRun(runId)?.usage;
	}

	private takeRun(runId: string): TrackedRun | undefined {
		const run = this.runs.get(runId);
		this.runs.delete(runId);
		return run;
	}

	private removeStaleRuns(now: number) {
		for (const [runId, run] of this.runs) {
			if (now - run.lastCallAt > STALE_RUN_MS) {
				this.runs.delete(runId);
			}
		}
	}
}

function recordFileUploadedAt(run: TrackedRun, uploadedAt: number) {
	if (Number.isNaN(uploadedAt)) {
		return;
	}

	run.newestFileUploadedAt = Math.max(run.newestFileUploadedAt ?? uploadedAt, uploadedAt);
	run.oldestFileUploadedAt = Math.min(run.oldestFileUploadedAt ?? uploadedAt, uploadedAt);
}

/** Ages in full days when the run ends. Empty when the run read no file. */
function fileAges(run: TrackedRun, now: number) {
	if (run.newestFileUploadedAt === undefined || run.oldestFileUploadedAt === undefined) {
		return {};
	}

	// A small clock difference can put a new upload in the future, so the age is never below 0.
	const toDays = (uploadedAt: number) =>
		Math.max(0, Math.floor((now - uploadedAt) / Time.days.toMilliseconds));
	return {
		file_age_days_min: toDays(run.newestFileUploadedAt),
		file_age_days_max: toDays(run.oldestFileUploadedAt),
	};
}

function emptyUsage(): KnowledgeRunUsage {
	return {
		file_find_count: 0,
		file_search_count: 0,
		file_read_count: 0,
		vector_store_search_count: 0,
		file_content_chars: 0,
		vector_store_content_chars: 0,
		file_failed_count: 0,
		vector_store_failed_count: 0,
	};
}
