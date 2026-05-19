import type { AgentKnowledgeEntry } from '@n8n/api-types';

export function areKnowledgeEntriesEquivalent(
	currentEntries: AgentKnowledgeEntry[],
	nextEntries: AgentKnowledgeEntry[],
): boolean {
	if (currentEntries.length !== nextEntries.length) return false;

	return currentEntries.every((entry, index) => {
		const nextEntry = nextEntries[index];
		return (
			nextEntry !== undefined &&
			entry.id === nextEntry.id &&
			entry.content === nextEntry.content &&
			entry.updatedAt === nextEntry.updatedAt &&
			entry.lastSeenAt === nextEntry.lastSeenAt &&
			entry.sourceCount === nextEntry.sourceCount &&
			entry.sources.length === nextEntry.sources.length
		);
	});
}

export function doesKnowledgeEntryMatchSearch(entry: AgentKnowledgeEntry, query: string): boolean {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) return true;

	const searchableText = [
		entry.content,
		...entry.sources.flatMap((source) => [
			source.threadTitle,
			source.observationText,
			source.evidenceText,
		]),
	]
		.filter((value): value is string => Boolean(value))
		.join('\n')
		.toLowerCase();

	return searchableText.includes(normalizedQuery);
}
