import {
	AgentJsonConfigSchema,
	type AgentKnowledgeEntry,
	type AgentKnowledgeResponse,
	type AgentKnowledgeSource,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';

import type { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import type { AgentMemoryEntryEntity } from './entities/agent-memory-entry.entity';
import type { AgentMemoryEntrySourceEntity } from './entities/agent-memory-entry-source.entity';
import type { AgentObservationEntity } from './entities/agent-observation.entity';
import type { AgentThreadEntity } from './entities/agent-thread.entity';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentMemoryEntrySourceRepository } from './repositories/agent-memory-entry-source.repository';
import { AgentMemoryEntryRepository } from './repositories/agent-memory-entry.repository';
import { AgentObservationRepository } from './repositories/agent-observation.repository';
import { AgentThreadRepository } from './repositories/agent-thread.repository';
import { AgentRepository } from './repositories/agent.repository';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';

interface ListAgentKnowledgeParams {
	projectId: string;
	agentId: string;
	userId: string;
}

function toIsoString(value: Date): string {
	return value.toISOString();
}

function uniqueStrings(values: string[]): string[] {
	return Array.from(new Set(values));
}

function groupSourcesByEntryId(
	sources: AgentMemoryEntrySourceEntity[],
): Map<string, AgentMemoryEntrySourceEntity[]> {
	const grouped = new Map<string, AgentMemoryEntrySourceEntity[]>();
	for (const source of sources) {
		grouped.set(source.memoryEntryId, [...(grouped.get(source.memoryEntryId) ?? []), source]);
	}
	return grouped;
}

@Service()
export class AgentKnowledgeService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly memoryEntryRepository: AgentMemoryEntryRepository,
		private readonly memoryEntrySourceRepository: AgentMemoryEntrySourceRepository,
		private readonly observationRepository: AgentObservationRepository,
		private readonly threadRepository: AgentThreadRepository,
		private readonly executionThreadRepository: AgentExecutionThreadRepository,
	) {}

	async listAgentKnowledge({
		projectId,
		agentId,
		userId,
	}: ListAgentKnowledgeParams): Promise<AgentKnowledgeResponse | null> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) return null;

		const parsedConfig = AgentJsonConfigSchema.safeParse(agent.schema);
		const memoryConfig = parsedConfig.success ? parsedConfig.data.memory : undefined;
		if (!memoryConfig?.enabled || memoryConfig.episodicMemory?.enabled !== true) {
			return { enabled: false, entries: [] };
		}

		const resourceId = draftChatMemoryResourceId(userId);
		const entries = await this.memoryEntryRepository.find({
			where: { agentId, resourceId, status: 'active' },
			order: { lastSeenAt: 'DESC', createdAt: 'DESC', id: 'ASC' },
		});

		if (entries.length === 0) {
			return { enabled: true, entries: [] };
		}

		const entryIds = entries.map((entry) => entry.id);
		const sources = await this.memoryEntrySourceRepository.find({
			where: { memoryEntryId: In(entryIds) },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
		const sourcesByEntryId = groupSourcesByEntryId(sources);

		const observationIds = uniqueStrings(sources.map((source) => source.observationId));
		const observations =
			observationIds.length > 0
				? await this.observationRepository.find({ where: { id: In(observationIds) } })
				: [];
		const observationsById = new Map(
			observations.map((observation) => [observation.id, observation]),
		);

		const threadIds = uniqueStrings(sources.map((source) => source.threadId));
		const [executionThreads, memoryThreads] =
			threadIds.length > 0
				? await Promise.all([
						this.executionThreadRepository.find({
							where: { id: In(threadIds), projectId, agentId },
						}),
						this.threadRepository.find({ where: { id: In(threadIds), resourceId: userId } }),
					])
				: [[], []];
		const executionThreadsById = new Map(executionThreads.map((thread) => [thread.id, thread]));
		const memoryThreadsById = new Map(memoryThreads.map((thread) => [thread.id, thread]));

		return {
			enabled: true,
			entries: entries.map((entry) =>
				this.toKnowledgeEntry(
					entry,
					sourcesByEntryId.get(entry.id) ?? [],
					observationsById,
					executionThreadsById,
					memoryThreadsById,
				),
			),
		};
	}

	private toKnowledgeEntry(
		entry: AgentMemoryEntryEntity,
		sources: AgentMemoryEntrySourceEntity[],
		observationsById: Map<string, AgentObservationEntity>,
		executionThreadsById: Map<string, AgentExecutionThread>,
		memoryThreadsById: Map<string, AgentThreadEntity>,
	): AgentKnowledgeEntry {
		return {
			id: entry.id,
			content: entry.content,
			createdAt: toIsoString(entry.createdAt),
			updatedAt: toIsoString(entry.updatedAt),
			lastSeenAt: toIsoString(entry.lastSeenAt),
			sourceCount: sources.length,
			sources: sources.map((source) =>
				this.toKnowledgeSource(source, observationsById, executionThreadsById, memoryThreadsById),
			),
		};
	}

	private toKnowledgeSource(
		source: AgentMemoryEntrySourceEntity,
		observationsById: Map<string, AgentObservationEntity>,
		executionThreadsById: Map<string, AgentExecutionThread>,
		memoryThreadsById: Map<string, AgentThreadEntity>,
	): AgentKnowledgeSource {
		const observation = observationsById.get(source.observationId);
		const executionThread = executionThreadsById.get(source.threadId);
		const memoryThread = memoryThreadsById.get(source.threadId);

		return {
			id: source.id,
			threadId: source.threadId,
			threadTitle: executionThread?.title ?? memoryThread?.title ?? null,
			threadSessionNumber: executionThread?.sessionNumber ?? null,
			observationId: source.observationId,
			observationMarker: observation?.marker ?? null,
			observationText: observation?.text ?? null,
			observationCreatedAt: observation ? toIsoString(observation.createdAt) : null,
			evidenceText: source.evidenceText,
			createdAt: toIsoString(source.createdAt),
		};
	}
}
