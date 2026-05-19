import type { EpisodicEvalEntry } from './types';
import { InMemoryMemory } from '../../src/runtime/memory-store';
import type {
	EpisodicMemoryEntry,
	EpisodicMemoryEntrySource,
	EpisodicMemoryReflectionApply,
	EpisodicMemoryScope,
	NewEpisodicMemoryEntry,
	NewEpisodicMemoryEntrySource,
	NewEpisodicMemoryEntrySourceForEntry,
} from '../../src/types';

export class InspectableInMemoryMemory extends InMemoryMemory {
	private readonly entries = new Map<string, EpisodicMemoryEntry>();

	private readonly sources = new Map<string, EpisodicMemoryEntrySource>();

	override async saveEpisodicMemoryEntries(
		entries: NewEpisodicMemoryEntry[],
	): Promise<EpisodicMemoryEntry[]> {
		const saved = await super.saveEpisodicMemoryEntries(entries);
		this.trackEntries(saved);
		return saved;
	}

	override async saveEpisodicMemoryEntrySources(
		sources: NewEpisodicMemoryEntrySource[],
	): Promise<EpisodicMemoryEntrySource[]> {
		const saved = await super.saveEpisodicMemoryEntrySources(sources);
		this.trackSources(saved);
		return saved;
	}

	override async saveEpisodicMemoryEntryWithSources(
		entry: NewEpisodicMemoryEntry,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
	): Promise<EpisodicMemoryEntry | null> {
		const saved = await super.saveEpisodicMemoryEntryWithSources(entry, sources);
		if (!saved) return null;
		this.trackEntries([saved]);
		this.trackSources(await this.getEpisodicMemoryEntrySources([saved.id]));
		return saved;
	}

	override async supersedeEpisodicMemoryEntries(
		ids: string[],
		supersededBy: string,
	): Promise<void> {
		await super.supersedeEpisodicMemoryEntries(ids, supersededBy);
		for (const id of ids) {
			const entry = this.entries.get(id);
			if (!entry || id === supersededBy) continue;
			this.entries.set(id, {
				...entry,
				status: 'superseded',
				supersededBy,
				updatedAt: new Date(),
			});
		}
	}

	override async applyEpisodicMemoryReflection(
		scope: EpisodicMemoryScope,
		reflection: EpisodicMemoryReflectionApply,
	) {
		const result = await super.applyEpisodicMemoryReflection(scope, reflection);
		this.trackEntries(result.inserted);
		for (const droppedId of result.droppedIds) {
			const entry = this.entries.get(droppedId);
			if (!entry) continue;
			this.entries.set(droppedId, { ...entry, status: 'dropped', updatedAt: new Date() });
		}
		for (const supersededId of result.supersededIds) {
			const entry = this.entries.get(supersededId);
			if (!entry) continue;
			this.entries.set(supersededId, {
				...entry,
				status: 'superseded',
				updatedAt: new Date(),
			});
		}
		this.trackSources(
			await this.getEpisodicMemoryEntrySources(result.inserted.map((entry) => entry.id)),
		);
		return result;
	}

	getEvalEntries(scope: EpisodicMemoryScope): EpisodicEvalEntry[] {
		const entries = [...this.entries.values()]
			.filter((entry) => entry.agentId === scope.agentId && entry.resourceId === scope.resourceId)
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
		return entries.map((entry) => ({
			id: entry.id,
			content: entry.content,
			status: entry.status,
			createdAt: entry.createdAt.toISOString(),
			updatedAt: entry.updatedAt.toISOString(),
			lastSeenAt: entry.lastSeenAt.toISOString(),
			sources: [...this.sources.values()]
				.filter((source) => source.memoryEntryId === entry.id)
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
				.map((source) => ({
					observationId: source.observationId,
					threadId: source.threadId,
					evidenceText: source.evidenceText,
				})),
		}));
	}

	private trackEntries(entries: EpisodicMemoryEntry[]): void {
		for (const entry of entries) {
			this.entries.set(entry.id, { ...entry });
		}
	}

	private trackSources(sources: EpisodicMemoryEntrySource[]): void {
		for (const source of sources) {
			this.sources.set(source.id, { ...source });
		}
	}
}
