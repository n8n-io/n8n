import type { EpisodicEvalEntry } from './types';
import { InMemoryMemory } from '../../src/runtime/memory-store';
import type {
	EpisodicMemoryEntry,
	EpisodicMemoryEntrySource,
	EpisodicMemoryMethods,
	EpisodicMemoryReflectionApply,
	EpisodicMemoryScope,
	NewEpisodicMemoryEntry,
	NewEpisodicMemoryEntrySourceForEntry,
} from '../../src/types';

export class InspectableInMemoryMemory extends InMemoryMemory {
	private readonly entries = new Map<string, EpisodicMemoryEntry>();

	private readonly sources = new Map<string, EpisodicMemoryEntrySource>();

	private readonly baseEpisodic: EpisodicMemoryMethods;

	override readonly episodic: EpisodicMemoryMethods;

	constructor() {
		super();
		this.baseEpisodic = this.episodic;
		this.episodic = {
			saveEntryWithSources: async (entry, sources) =>
				await this.saveEntryWithSourcesForEval(entry, sources),
			searchEntries: async (scope, query, opts) =>
				await this.baseEpisodic.searchEntries(scope, query, opts),
			getEntrySources: async (entryIds) => await this.baseEpisodic.getEntrySources(entryIds),
			applyReflection: async (scope, reflection) =>
				await this.applyReflectionForEval(scope, reflection),
			getCursor: async (scope) => await this.baseEpisodic.getCursor(scope),
			setCursor: async (cursor) => await this.baseEpisodic.setCursor(cursor),
		};
	}

	getEvalEntries(scope: EpisodicMemoryScope): EpisodicEvalEntry[] {
		const entries = [...this.entries.values()]
			.filter(
				(entry) => entry.namespace === scope.namespace && entry.resourceId === scope.resourceId,
			)
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

	private async saveEntryWithSourcesForEval(
		entry: NewEpisodicMemoryEntry,
		sources: NewEpisodicMemoryEntrySourceForEntry[],
	): Promise<EpisodicMemoryEntry | null> {
		const saved = await this.baseEpisodic.saveEntryWithSources(entry, sources);
		if (!saved) return null;
		this.trackEntries([saved]);
		this.trackSources(await this.baseEpisodic.getEntrySources([saved.id]));
		return saved;
	}

	private async applyReflectionForEval(
		scope: EpisodicMemoryScope,
		reflection: EpisodicMemoryReflectionApply,
	) {
		const result = await this.baseEpisodic.applyReflection(scope, reflection);
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
			await this.baseEpisodic.getEntrySources(result.inserted.map((entry) => entry.id)),
		);
		return result;
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
