import type {
	AgentMemoryEntriesPageDto,
	AgentMemoryEntryDto,
	AgentMemorySourceFacetsDto,
	ListAgentMemoryEntriesQueryDto,
} from '@n8n/api-types';
import { UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import { N8nMemory, type EpisodicMemorySourceWithMessageContext } from './integrations/n8n-memory';
import {
	AgentMemoryEntryRepository,
	type MemoryEntrySourceFilter,
} from './repositories/agent-memory-entry.repository';
import { AgentRepository } from './repositories/agent.repository';
import type { AgentMemoryEntryEntity } from './entities/agent-memory-entry.entity';
import { getAgentOrThrow } from './utils/get-agent-or-throw';
import { buildMemoryEntrySource, chatSourceOwner } from './utils/memory-entry-source';
import {
	buildMemorySourceFacetGroups,
	sourceMatchesFilter,
	toMemoryEntrySourceFilter,
} from './utils/memory-source-filter';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

interface PageCursor {
	createdAt: Date;
	id: string;
}

function parseLimit(limit: string | undefined): number {
	const parsed = Number.parseInt(limit ?? '', 10);
	if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_PAGE_SIZE;
	return Math.min(parsed, MAX_PAGE_SIZE);
}

function encodeCursor(entry: AgentMemoryEntryEntity): string {
	return `${entry.createdAt.toISOString()}|${entry.id}`;
}

function parseCursor(cursor: string | undefined): PageCursor | undefined {
	if (!cursor) return undefined;
	const [createdAt, id] = cursor.split('|');
	const date = new Date(createdAt);
	if (!id || Number.isNaN(date.getTime())) throw new BadRequestError('Invalid cursor');
	return { createdAt: date, id };
}

function groupByEntry(
	sources: EpisodicMemorySourceWithMessageContext[],
): Map<string, EpisodicMemorySourceWithMessageContext[]> {
	const grouped = new Map<string, EpisodicMemorySourceWithMessageContext[]>();
	for (const source of sources) {
		grouped.set(source.memoryEntryId, [...(grouped.get(source.memoryEntryId) ?? []), source]);
	}
	return grouped;
}

/** A user without a name has no label. The email is not shown to other users. */
function displayName(user: Pick<User, 'firstName' | 'lastName'>): string | undefined {
	return [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined;
}

@Service()
export class AgentMemoryEntriesService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly memoryEntryRepository: AgentMemoryEntryRepository,
		private readonly n8nMemory: N8nMemory,
		private readonly userRepository: UserRepository,
	) {}

	async list(
		agentId: string,
		projectId: string,
		viewerId: string,
		query: ListAgentMemoryEntriesQueryDto,
	): Promise<AgentMemoryEntriesPageDto> {
		await getAgentOrThrow(this.agentRepository, agentId, projectId);
		const filter = toMemoryEntrySourceFilter(query);
		const limit = parseLimit(query.limit);
		const [rows, total] = await Promise.all([
			this.memoryEntryRepository.listActiveByAgent(
				agentId,
				limit + 1,
				parseCursor(query.cursor),
				filter,
			),
			this.memoryEntryRepository.countActiveByAgent(agentId, filter),
		]);
		const entries = rows.slice(0, limit);
		const items = await this.toDtos(agentId, entries, viewerId, filter);
		const hasMore = rows.length > limit;
		return { items, total, nextCursor: hasMore ? encodeCursor(entries[entries.length - 1]) : null };
	}

	async listSourceFacets(
		agentId: string,
		projectId: string,
		viewerId: string,
	): Promise<AgentMemorySourceFacetsDto> {
		await getAgentOrThrow(this.agentRepository, agentId, projectId);
		const rows = await this.memoryEntryRepository.findSourceFacetRows(agentId);
		const userNames = await this.loadChatUserNames(rows);
		return { groups: buildMemorySourceFacetGroups(rows, userNames, viewerId) };
	}

	async delete(agentId: string, projectId: string, entryId: string): Promise<void> {
		await getAgentOrThrow(this.agentRepository, agentId, projectId);
		const deleted = await this.memoryEntryRepository.markDeleted(agentId, entryId);
		if (!deleted) throw new NotFoundError(`Memory entry "${entryId}" not found`);
	}

	private async toDtos(
		agentId: string,
		entries: AgentMemoryEntryEntity[],
		viewerId: string,
		filter: MemoryEntrySourceFilter,
	): Promise<AgentMemoryEntryDto[]> {
		const sources = await this.n8nMemory
			.getImplementation(agentId)
			.getEntrySourcesWithMessageContext(entries.map(({ id }) => id));
		const sourcesByEntry = groupByEntry(sources);
		const userNames = await this.loadChatUserNames(entries);
		return entries.map((entry) => {
			const entrySources = sourcesByEntry.get(entry.id) ?? [];
			// Sources come oldest first. Show the newest one that fits the filter.
			const shownSource =
				entrySources.filter((source) => sourceMatchesFilter(source, filter)).at(-1) ??
				entrySources.at(-1) ??
				{};
			return {
				id: entry.id,
				content: entry.content,
				createdAt: entry.createdAt.toISOString(),
				source: buildMemoryEntrySource(entry.resourceId, shownSource, userNames, viewerId),
				otherSourceCount: this.countOtherSources(entrySources),
			};
		});
	}

	/** Sources come oldest first, so the last one is the newest. */
	private countOtherSources(sources: EpisodicMemorySourceWithMessageContext[]): number {
		const threads = new Set(sources.map(({ threadId }) => threadId));
		return Math.max(threads.size - 1, 0);
	}

	private async loadChatUserNames(
		entries: Array<Pick<AgentMemoryEntryEntity, 'resourceId'>>,
	): Promise<Map<string, string>> {
		const userIds = new Set(
			entries.flatMap(({ resourceId }) => chatSourceOwner(resourceId)?.userId ?? []),
		);
		if (userIds.size === 0) return new Map();
		const users = await this.userRepository.findManyByIds([...userIds]);
		return new Map(
			users.flatMap((user) => {
				const name = displayName(user);
				return name ? [[user.id, name] as const] : [];
			}),
		);
	}
}
