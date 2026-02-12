/**
 * Constants for AI connection types in code generation
 */

import type { AiConnectionType } from './types';

/**
 * Map AI connection types to their config key names
 */
export const AI_CONNECTION_TO_CONFIG_KEY: Record<AiConnectionType, string> = {
	ai_languageModel: 'model',
	ai_memory: 'memory',
	ai_tool: 'tools', // plural - can have multiple
	ai_outputParser: 'outputParser',
	ai_embedding: 'embedding',
	ai_vectorStore: 'vectorStore',
	ai_retriever: 'retriever',
	ai_document: 'documentLoader',
	ai_textSplitter: 'textSplitter',
	ai_reranker: 'reranker',
};

/**
 * Map AI connection types to their builder function names
 */
export const AI_CONNECTION_TO_BUILDER: Record<AiConnectionType, string> = {
	ai_languageModel: 'languageModel',
	ai_memory: 'memory',
	ai_tool: 'tool',
	ai_outputParser: 'outputParser',
	ai_embedding: 'embedding',
	ai_vectorStore: 'vectorStore',
	ai_retriever: 'retriever',
	ai_document: 'documentLoader',
	ai_textSplitter: 'textSplitter',
	ai_reranker: 'reranker',
};

/**
 * AI connection types that are ALWAYS arrays (even with single item)
 */
export const AI_ALWAYS_ARRAY_TYPES = new Set<AiConnectionType>(['ai_tool']);

/**
 * AI connection types that can be single or array (array only when multiple)
 */
export const AI_OPTIONAL_ARRAY_TYPES = new Set<AiConnectionType>(['ai_languageModel']);
