import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { smartDecimal } from '@n8n/utils/number/smart-decimal';

import type { AgentRunTelemetryType } from '@/interfaces';
import { Telemetry } from '@/telemetry';

export type KnowledgeToolCall = 'file_find' | 'file_search' | 'file_read' | 'vector_store_search';

/**
 * A failed call sends no knowledge content, so it has no characters to count.
 * `readFile` is the file that a successful read used, with its upload time.
 */
export type KnowledgeToolCallResult =
	| { failed: false; contentChars: number; readFile?: { fileId: string; uploadedAt: string } }
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
	/** Calls started so far. Gives each call its place, because concurrent calls can end in another order. */
	startedCalls: number;
	/** Each file that the run read, by file id, with its upload time and the place of its first read call. */
	readFiles: Map<string, { uploadedAt: number; callOrder: number }>;
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

		const run: TrackedRun = this.runs.get(runId) ?? {
			usage: emptyUsage(),
			lastCallAt: now,
			startedCalls: 0,
			readFiles: new Map(),
		};
		const callOrder = run.startedCalls++;
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
				if (result.readFile) {
					recordReadFile(run, result.readFile, callOrder);
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

function recordReadFile(
	run: TrackedRun,
	readFile: { fileId: string; uploadedAt: string },
	callOrder: number,
) {
	const uploadedAt = Date.parse(readFile.uploadedAt);
	if (Number.isNaN(uploadedAt)) {
		return;
	}

	const knownFile = run.readFiles.get(readFile.fileId);
	if (knownFile) {
		knownFile.callOrder = Math.min(knownFile.callOrder, callOrder);
		return;
	}

	run.readFiles.set(readFile.fileId, { uploadedAt, callOrder });
}

function median(sortedValues: number[]) {
	const middle = Math.floor(sortedValues.length / 2);
	if (sortedValues.length % 2 === 1) {
		return sortedValues[middle];
	}

	return (sortedValues[middle - 1] + sortedValues[middle]) / 2;
}

function ageInFullDays(uploadedAt: number, now: number) {
	const fullDays = Math.floor((now - uploadedAt) / Time.days.toMilliseconds);
	// A small clock difference can put a new upload in the future, so the age is never below 0.
	return Math.max(0, fullDays);
}

/** Ages in full days when the run ends, each read file once. Empty when the run read no file. */
function fileAges(run: TrackedRun, now: number) {
	if (run.readFiles.size === 0) {
		return {};
	}

	const filesInCallOrder = [...run.readFiles.values()].sort((a, b) => a.callOrder - b.callOrder);
	const ages = filesInCallOrder.map(({ uploadedAt }) => ageInFullDays(uploadedAt, now));
	const sortedAges = [...ages].sort((a, b) => a - b);
	const averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
	return {
		file_age_days_min: sortedAges[0],
		file_age_days_max: sortedAges[sortedAges.length - 1],
		file_age_days_avg: smartDecimal(averageAge, 1),
		file_age_days_median: median(sortedAges),
		file_age_days_first_25: ages.slice(0, 25), // adds a random limit to avoid huge arrays
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
