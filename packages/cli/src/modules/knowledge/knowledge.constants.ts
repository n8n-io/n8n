export const KNOWLEDGE_MODULE_NAME = 'knowledge';

export const KNOWLEDGE_SOURCE_TYPES = ['github', 'n8n'] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export const KNOWLEDGE_SOURCE_STATUSES = ['pending', 'syncing', 'ready', 'error'] as const;
export type KnowledgeSourceStatus = (typeof KNOWLEDGE_SOURCE_STATUSES)[number];

export const KNOWLEDGE_SYNC_MODES = ['full', 'incremental'] as const;
export type KnowledgeSyncMode = (typeof KNOWLEDGE_SYNC_MODES)[number];

export const KNOWLEDGE_SYNC_RUN_STATUSES = ['running', 'success', 'error'] as const;
export type KnowledgeSyncRunStatus = (typeof KNOWLEDGE_SYNC_RUN_STATUSES)[number];

export const KNOWLEDGE_SETTINGS_KEY = 'knowledge.settings';

/** Qdrant collection used when the admin does not name one explicitly. */
export const KNOWLEDGE_DEFAULT_COLLECTION_NAME = 'n8n_knowledge';
