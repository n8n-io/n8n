/**
 * Instance-level PostHog flag for knowledge collections: their endpoints, their
 * pages in the editor and their retrieval by agents.
 */
export const KNOWLEDGE_COLLECTIONS_FLAG = '146_knowledge_collections';

/** Same fields as AgentFileDto, so the editor can reuse its file components. */
export interface KnowledgeCollectionFileDto {
	id: string;
	collectionId: string;
	fileName: string;
	mimeType: string;
	fileSizeBytes: number;
	createdAt: string;
}

export interface KnowledgeCollectionFileListResponse {
	count: number;
	totalSizeBytes: number;
	data: KnowledgeCollectionFileDto[];
}

/** An agent that uses a knowledge collection. */
export interface KnowledgeCollectionAgentDto {
	id: string;
	name: string;
	projectId: string;
}
