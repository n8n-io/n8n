import { describe, it, expect } from '@jest/globals';

import {
	AI_CONNECTION_TO_CONFIG_KEY,
	AI_CONNECTION_TO_BUILDER,
	AI_ALWAYS_ARRAY_TYPES,
	AI_OPTIONAL_ARRAY_TYPES,
} from './constants';

describe('constants', () => {
	describe('AI_CONNECTION_TO_CONFIG_KEY', () => {
		it('maps ai_languageModel to model', () => {
			expect(AI_CONNECTION_TO_CONFIG_KEY.ai_languageModel).toBe('model');
		});

		it('maps ai_memory to memory', () => {
			expect(AI_CONNECTION_TO_CONFIG_KEY.ai_memory).toBe('memory');
		});

		it('maps ai_tool to tools (plural)', () => {
			expect(AI_CONNECTION_TO_CONFIG_KEY.ai_tool).toBe('tools');
		});

		it('maps ai_outputParser to outputParser', () => {
			expect(AI_CONNECTION_TO_CONFIG_KEY.ai_outputParser).toBe('outputParser');
		});

		it('maps ai_embedding to embedding', () => {
			expect(AI_CONNECTION_TO_CONFIG_KEY.ai_embedding).toBe('embedding');
		});

		it('maps ai_vectorStore to vectorStore', () => {
			expect(AI_CONNECTION_TO_CONFIG_KEY.ai_vectorStore).toBe('vectorStore');
		});

		it('maps ai_retriever to retriever', () => {
			expect(AI_CONNECTION_TO_CONFIG_KEY.ai_retriever).toBe('retriever');
		});

		it('maps ai_document to documentLoader', () => {
			expect(AI_CONNECTION_TO_CONFIG_KEY.ai_document).toBe('documentLoader');
		});

		it('maps ai_textSplitter to textSplitter', () => {
			expect(AI_CONNECTION_TO_CONFIG_KEY.ai_textSplitter).toBe('textSplitter');
		});

		it('maps ai_reranker to reranker', () => {
			expect(AI_CONNECTION_TO_CONFIG_KEY.ai_reranker).toBe('reranker');
		});
	});

	describe('AI_CONNECTION_TO_BUILDER', () => {
		it('maps ai_languageModel to languageModel', () => {
			expect(AI_CONNECTION_TO_BUILDER.ai_languageModel).toBe('languageModel');
		});

		it('maps ai_memory to memory', () => {
			expect(AI_CONNECTION_TO_BUILDER.ai_memory).toBe('memory');
		});

		it('maps ai_tool to tool (singular)', () => {
			expect(AI_CONNECTION_TO_BUILDER.ai_tool).toBe('tool');
		});

		it('maps ai_outputParser to outputParser', () => {
			expect(AI_CONNECTION_TO_BUILDER.ai_outputParser).toBe('outputParser');
		});

		it('maps ai_embedding to embedding', () => {
			expect(AI_CONNECTION_TO_BUILDER.ai_embedding).toBe('embedding');
		});

		it('maps ai_vectorStore to vectorStore', () => {
			expect(AI_CONNECTION_TO_BUILDER.ai_vectorStore).toBe('vectorStore');
		});

		it('maps ai_retriever to retriever', () => {
			expect(AI_CONNECTION_TO_BUILDER.ai_retriever).toBe('retriever');
		});

		it('maps ai_document to documentLoader', () => {
			expect(AI_CONNECTION_TO_BUILDER.ai_document).toBe('documentLoader');
		});

		it('maps ai_textSplitter to textSplitter', () => {
			expect(AI_CONNECTION_TO_BUILDER.ai_textSplitter).toBe('textSplitter');
		});

		it('maps ai_reranker to reranker', () => {
			expect(AI_CONNECTION_TO_BUILDER.ai_reranker).toBe('reranker');
		});
	});

	describe('AI_ALWAYS_ARRAY_TYPES', () => {
		it('includes ai_tool', () => {
			expect(AI_ALWAYS_ARRAY_TYPES.has('ai_tool')).toBe(true);
		});

		it('does not include ai_languageModel', () => {
			expect(AI_ALWAYS_ARRAY_TYPES.has('ai_languageModel')).toBe(false);
		});

		it('does not include ai_memory', () => {
			expect(AI_ALWAYS_ARRAY_TYPES.has('ai_memory')).toBe(false);
		});
	});

	describe('AI_OPTIONAL_ARRAY_TYPES', () => {
		it('includes ai_languageModel', () => {
			expect(AI_OPTIONAL_ARRAY_TYPES.has('ai_languageModel')).toBe(true);
		});

		it('does not include ai_tool', () => {
			expect(AI_OPTIONAL_ARRAY_TYPES.has('ai_tool')).toBe(false);
		});

		it('does not include ai_memory', () => {
			expect(AI_OPTIONAL_ARRAY_TYPES.has('ai_memory')).toBe(false);
		});
	});
});
