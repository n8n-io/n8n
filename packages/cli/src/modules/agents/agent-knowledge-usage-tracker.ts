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
 * `searchDurationMs`, `emptySearch` and `errorType` describe search calls only.
 */
export type KnowledgeToolCallResult =
	| {
			failed: false;
			contentChars: number;
			readFile?: { fileId: string; uploadedAt: string };
			searchDurationMs?: number;
			emptySearch?: boolean;
	  }
	| { failed: true; searchDurationMs?: number; errorType?: string };

type SearchKind = 'file' | 'vector_store';

const searchKindByCall: Partial<Record<KnowledgeToolCall, SearchKind>> = {
	file_search: 'file',
	vector_store_search: 'vector_store',
};

interface SearchStats {
	count: number;
	totalDurationMs: number;
	maxDurationMs: number;
	emptyCount: number;
	errorTypes: Set<string>;
}

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
	lastToolCallAt: number;
	/** Calls started so far. Gives each call its place, because concurrent calls can end in another order. */
	startedToolCalls: number;
	/** Each file that the run read, by file id, with its upload time and the place of its first read call. */
	readFiles: Map<string, { uploadedAt: number; toolCallOrder: number }>;
	searches: Partial<Record<SearchKind, SearchStats>>;
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
			...searchProperties(trackedRun),
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
			lastToolCallAt: now,
			startedToolCalls: 0,
			readFiles: new Map(),
			searches: {},
		};
		const toolCallOrder = run.startedToolCalls++;
		run.usage[usageKeyByCall[call]]++;
		run.lastToolCallAt = now;
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
					recordReadFile(run, result.readFile, toolCallOrder);
				}
			}

			const searchKind = searchKindByCall[call];
			if (searchKind && result.searchDurationMs !== undefined) {
				recordSearch(run, searchKind, result);
			}

			run.lastToolCallAt = Date.now();
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
			if (now - run.lastToolCallAt > STALE_RUN_MS) {
				this.runs.delete(runId);
			}
		}
	}
}

function recordReadFile(
	run: TrackedRun,
	readFile: { fileId: string; uploadedAt: string },
	toolCallOrder: number,
) {
	const uploadedAt = Date.parse(readFile.uploadedAt);
	if (Number.isNaN(uploadedAt)) {
		return;
	}

	const knownFile = run.readFiles.get(readFile.fileId);
	if (knownFile) {
		knownFile.toolCallOrder = Math.min(knownFile.toolCallOrder, toolCallOrder);
		return;
	}

	run.readFiles.set(readFile.fileId, { uploadedAt, toolCallOrder });
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

	const filesInToolCallOrder = [...run.readFiles.values()].sort(
		(a, b) => a.toolCallOrder - b.toolCallOrder,
	);
	const ages = filesInToolCallOrder.map(({ uploadedAt }) => ageInFullDays(uploadedAt, now));
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

function recordSearch(run: TrackedRun, kind: SearchKind, result: KnowledgeToolCallResult) {
	const stats = (run.searches[kind] ??= {
		count: 0,
		totalDurationMs: 0,
		maxDurationMs: 0,
		emptyCount: 0,
		errorTypes: new Set(),
	});
	const durationMs = result.searchDurationMs ?? 0;
	stats.count++;
	stats.totalDurationMs += durationMs;
	stats.maxDurationMs = Math.max(stats.maxDurationMs, durationMs);
	if (result.failed) {
		if (result.errorType) {
			stats.errorTypes.add(result.errorType);
		}
	} else if (result.emptySearch) {
		stats.emptyCount++;
	}
}

function averageDurationMs(stats: SearchStats) {
	return Math.round(stats.totalDurationMs / stats.count);
}

/** Search fields for each kind that the run searched. */
function searchProperties({ searches: { file, vector_store: vectorStore } }: TrackedRun) {
	return {
		...(file && {
			file_search_duration_ms_avg: averageDurationMs(file),
			file_search_duration_ms_max: file.maxDurationMs,
			file_empty_search_count: file.emptyCount,
			file_error_types: [...file.errorTypes].sort(),
		}),
		...(vectorStore && {
			vector_store_search_duration_ms_avg: averageDurationMs(vectorStore),
			vector_store_search_duration_ms_max: vectorStore.maxDurationMs,
			vector_store_empty_search_count: vectorStore.emptyCount,
			vector_store_error_types: [...vectorStore.errorTypes].sort(),
		}),
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
