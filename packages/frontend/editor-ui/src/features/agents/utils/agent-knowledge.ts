import type { AgentKnowledgeEntry } from '@n8n/api-types';

import type { AgentJsonConfig } from '../types';

export function isEpisodicKnowledgeEnabled(config: AgentJsonConfig | null): boolean {
	return config?.memory?.enabled === true && config.memory.episodicMemory?.enabled === true;
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
