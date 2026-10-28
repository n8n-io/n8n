import { FLAG_MEMORY_TOOL_NAME, RECALL_MEMORY_TOOL_NAME } from '@n8n/agents';
import type {
	AgentThreadMemoryDto,
	AgentTraceFlaggedMemoryDto,
	AgentTraceFlaggedMemoryStatus,
	AgentTraceMemoryOriginDto,
	AgentTraceRecalledMemoryDto,
	AgentTraceRecalledMemoryStatus,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';

import type { AgentExecution } from './entities/agent-execution.entity';
import type { AgentMemoryEntryCandidateEntity } from './entities/agent-memory-entry-candidate.entity';
import type { AgentMemoryEntrySourceEntity } from './entities/agent-memory-entry-source.entity';
import type { AgentMemoryEntryEntity } from './entities/agent-memory-entry.entity';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentMemoryEntryCandidateRepository } from './repositories/agent-memory-entry-candidate.repository';
import { AgentMemoryEntrySourceRepository } from './repositories/agent-memory-entry-source.repository';
import { AgentMemoryEntryRepository } from './repositories/agent-memory-entry.repository';
import { threadBelongsTo } from './utils/agent-thread-access';

export interface ThreadMemoryRequest {
	agentId: string;
	projectId: string;
	userId: string;
	threadId: string;
	executions: AgentExecution[];
}

interface MemoryToolCalls {
	/** Entry ids per recall_memory call. Calls recorded before ids were traced are left out. */
	recalls: Map<string, string[]>;
	flagToolCallIds: string[];
}

function recalledEntryIds(traceOutput: unknown): string[] | undefined {
	if (!isRecord(traceOutput) || !Array.isArray(traceOutput.entryIds)) return undefined;
	return traceOutput.entryIds.filter((id): id is string => typeof id === 'string');
}

function collectMemoryToolCalls(executions: AgentExecution[]): MemoryToolCalls {
	const calls: MemoryToolCalls = { recalls: new Map(), flagToolCallIds: [] };
	for (const event of executions.flatMap((execution) => execution.timeline ?? [])) {
		if (event.type !== 'tool-call' || !event.success || event.canceled) continue;
		if (event.name === FLAG_MEMORY_TOOL_NAME) calls.flagToolCallIds.push(event.toolCallId);
		if (event.name !== RECALL_MEMORY_TOOL_NAME) continue;
		const entryIds = recalledEntryIds(event.traceOutput);
		if (entryIds) calls.recalls.set(event.toolCallId, entryIds);
	}
	return calls;
}

function recalledStatus(entry: AgentMemoryEntryEntity): AgentTraceRecalledMemoryStatus {
	if (entry.status === 'active' || entry.status === 'deleted') return entry.status;
	return 'replaced';
}

function flaggedStatus(
	candidate: AgentMemoryEntryCandidateEntity,
	entry: AgentMemoryEntryEntity | undefined,
): AgentTraceFlaggedMemoryStatus {
	if (candidate.status !== 'completed') return candidate.status;
	if (entry?.status === 'active') return 'stored';
	if (entry?.status === 'deleted') return 'deleted';
	return 'replaced';
}

/** Sources come oldest first, so the last one per entry is the newest. */
function newestSourceByEntry(
	sources: AgentMemoryEntrySourceEntity[],
): Map<string, AgentMemoryEntrySourceEntity> {
	return new Map(sources.map((source) => [source.memoryEntryId, source]));
}

/**
 * A merge copies a candidate's sources to the replacement entry, so a candidate
 * can point at several entries. An active entry wins. Otherwise the newest
 * source wins, because sources come oldest first. Ordering alone is not enough:
 * a merge skips a copy when the replacement already has a matching source.
 */
function currentEntryByCandidate(
	sources: AgentMemoryEntrySourceEntity[],
	entries: AgentMemoryEntryEntity[],
): Map<string, AgentMemoryEntryEntity> {
	const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
	const result = new Map<string, AgentMemoryEntryEntity>();
	for (const source of sources) {
		const entry = entriesById.get(source.memoryEntryId);
		if (!entry || !source.candidateId) continue;
		if (result.get(source.candidateId)?.status === 'active') continue;
		result.set(source.candidateId, entry);
	}
	return result;
}

/**
 * Resolves the recall_memory and flag_memory calls of a session trace to the
 * stored entries and capture candidates they returned or enqueued.
 */
@Service()
export class AgentMemoryTraceService {
	constructor(
		private readonly entryRepository: AgentMemoryEntryRepository,
		private readonly sourceRepository: AgentMemoryEntrySourceRepository,
		private readonly candidateRepository: AgentMemoryEntryCandidateRepository,
		private readonly threadRepository: AgentExecutionThreadRepository,
	) {}

	async getThreadMemory(request: ThreadMemoryRequest): Promise<AgentThreadMemoryDto> {
		const calls = collectMemoryToolCalls(request.executions);
		const [recalls, flags] = await Promise.all([
			this.resolveRecalls(request, calls.recalls),
			this.resolveFlags(request, calls.flagToolCallIds),
		]);
		return { recalls, flags };
	}

	private async resolveRecalls(
		request: ThreadMemoryRequest,
		recalls: Map<string, string[]>,
	): Promise<AgentThreadMemoryDto['recalls']> {
		const entryIds = [...new Set([...recalls.values()].flat())];
		const entries = await this.entryRepository.findInAnyStatus(request.agentId, entryIds);
		const sources = newestSourceByEntry(
			await this.sourceRepository.findByEntryIds(request.agentId, entryIds),
		);
		const openable = await this.findOpenableThreadIds(request, [...sources.values()]);
		const entriesById = new Map(entries.map((entry) => [entry.id, entry]));

		const result: AgentThreadMemoryDto['recalls'] = {};
		for (const [toolCallId, ids] of recalls) {
			result[toolCallId] = ids.flatMap((id) => {
				const entry = entriesById.get(id);
				if (!entry) return [];
				return [this.toRecalledMemory(entry, sources.get(id), openable)];
			});
		}
		return result;
	}

	private toRecalledMemory(
		entry: AgentMemoryEntryEntity,
		source: AgentMemoryEntrySourceEntity | undefined,
		openableThreadIds: Set<string>,
	): AgentTraceRecalledMemoryDto {
		const recalled: AgentTraceRecalledMemoryDto = {
			entryId: entry.id,
			content: entry.content,
			status: recalledStatus(entry),
		};
		if (!source) return recalled;
		const origin: AgentTraceMemoryOriginDto = {
			threadId: source.threadId,
			canOpen: openableThreadIds.has(source.threadId),
			evidence: source.evidenceText,
			createdAt: source.createdAt.toISOString(),
		};
		return { ...recalled, origin };
	}

	private async resolveFlags(
		request: ThreadMemoryRequest,
		toolCallIds: string[],
	): Promise<AgentThreadMemoryDto['flags']> {
		const candidates = await this.candidateRepository.findByToolCalls(
			request.agentId,
			request.threadId,
			toolCallIds,
		);
		const sources = await this.sourceRepository.findByCandidateIds(
			request.agentId,
			candidates.map(({ id }) => id),
		);
		const entries = await this.entryRepository.findInAnyStatus(
			request.agentId,
			sources.map(({ memoryEntryId }) => memoryEntryId),
		);
		const entryByCandidate = currentEntryByCandidate(sources, entries);

		const result: AgentThreadMemoryDto['flags'] = {};
		for (const candidate of candidates) {
			const flagged: AgentTraceFlaggedMemoryDto = {
				captureId: candidate.id,
				content: candidate.content,
				evidence: candidate.evidenceText,
				status: flaggedStatus(candidate, entryByCandidate.get(candidate.id)),
			};
			result[candidate.toolCallId] = flagged;
		}
		return result;
	}

	private async findOpenableThreadIds(
		request: ThreadMemoryRequest,
		sources: AgentMemoryEntrySourceEntity[],
	): Promise<Set<string>> {
		const threadIds = [...new Set(sources.map(({ threadId }) => threadId))];
		const threads = await this.threadRepository.findManyByIds(threadIds);
		return new Set(
			threads
				.filter((thread) =>
					threadBelongsTo(thread, request.projectId, request.agentId, request.userId),
				)
				.map(({ id }) => id),
		);
	}
}
