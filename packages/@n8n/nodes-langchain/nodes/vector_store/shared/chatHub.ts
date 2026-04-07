import type { Document } from '@langchain/core/documents';

/**
 * Metadata fields stored in the vector store per document.
 * Includes 'loc' prefix to capture flattened LangChain PDF page location fields
 * (e.g. "loc.pageNumber", "loc.lines.from") added by PDFLoader when splitPages is enabled.
 */
const CHAT_HUB_INSERT_METADATA_KEYS = new Set(['loc', 'fileName', 'agentId', 'fileKnowledgeId']);

/**
 * Metadata fields returned in similarity search results.
 * Intentionally excludes other fields for less token consumption
 */
export const CHAT_HUB_RETRIEVE_METADATA_KEYS = new Set(['loc', 'fileName']);

/**
 * Filters document metadata to only the allowed keys.
 * Handles both structured insertion ("loc": {...}) and flattened retrieval ("loc.pageNumber": 1).
 */
export function filterChatHubMetadata(
	metadata: Record<string, unknown>,
	allowedKeys: Set<string>,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(metadata).filter(([key]) => allowedKeys.has(key) || key.startsWith('loc.')),
	);
}

/**
 * Strip unnecessary metadata fields for storage efficiency
 */
export function filterChatHubInsertDocuments(
	documents: Array<Document<Record<string, unknown>>>,
): Array<Document<Record<string, unknown>>> {
	return documents.map((doc) => ({
		...doc,
		metadata: filterChatHubMetadata(doc.metadata, CHAT_HUB_INSERT_METADATA_KEYS),
	}));
}
