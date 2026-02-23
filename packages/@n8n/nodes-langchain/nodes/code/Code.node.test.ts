import { transformLegacyLangchainImport } from './Code.node';

describe('Code.node', () => {
	describe('transformLegacyLangchainImport', () => {
		describe('transforms legacy langchain imports to @langchain/classic', () => {
			it('should transform langchain/chains to @langchain/classic/chains', () => {
				const result = transformLegacyLangchainImport('langchain/chains');
				expect(result).toBe('@langchain/classic/chains');
			});

			it('should transform langchain/agents to @langchain/classic/agents', () => {
				const result = transformLegacyLangchainImport('langchain/agents');
				expect(result).toBe('@langchain/classic/agents');
			});

			it('should transform langchain/memory to @langchain/classic/memory', () => {
				const result = transformLegacyLangchainImport('langchain/memory');
				expect(result).toBe('@langchain/classic/memory');
			});

			it('should transform langchain/retrievers to @langchain/classic/retrievers', () => {
				const result = transformLegacyLangchainImport('langchain/retrievers');
				expect(result).toBe('@langchain/classic/retrievers');
			});

			it('should transform langchain/tools to @langchain/classic/tools', () => {
				const result = transformLegacyLangchainImport('langchain/tools');
				expect(result).toBe('@langchain/classic/tools');
			});

			it('should transform langchain/output_parsers to @langchain/classic/output_parsers', () => {
				const result = transformLegacyLangchainImport('langchain/output_parsers');
				expect(result).toBe('@langchain/classic/output_parsers');
			});

			it('should transform nested paths like langchain/chains/combine_documents', () => {
				const result = transformLegacyLangchainImport('langchain/chains/combine_documents');
				expect(result).toBe('@langchain/classic/chains/combine_documents');
			});

			it('should transform langchain/embeddings/cache_backed', () => {
				const result = transformLegacyLangchainImport('langchain/embeddings/cache_backed');
				expect(result).toBe('@langchain/classic/embeddings/cache_backed');
			});

			it('should transform langchain/document_loaders/fs/text', () => {
				const result = transformLegacyLangchainImport('langchain/document_loaders/fs/text');
				expect(result).toBe('@langchain/classic/document_loaders/fs/text');
			});

			it('should transform langchain/text_splitter', () => {
				const result = transformLegacyLangchainImport('langchain/text_splitter');
				expect(result).toBe('@langchain/classic/text_splitter');
			});

			it('should transform langchain/experimental/autogpt', () => {
				const result = transformLegacyLangchainImport('langchain/experimental/autogpt');
				expect(result).toBe('@langchain/classic/experimental/autogpt');
			});
		});

		describe('does not transform non-classic imports', () => {
			it('should not transform @langchain/core imports', () => {
				const result = transformLegacyLangchainImport('@langchain/core/prompts');
				expect(result).toBe('@langchain/core/prompts');
			});

			it('should not transform @langchain/community imports', () => {
				const result = transformLegacyLangchainImport(
					'@langchain/community/tools/wikipedia_query_run',
				);
				expect(result).toBe('@langchain/community/tools/wikipedia_query_run');
			});

			it('should not transform @langchain/openai imports', () => {
				const result = transformLegacyLangchainImport('@langchain/openai');
				expect(result).toBe('@langchain/openai');
			});

			it('should not transform already correct @langchain/classic imports', () => {
				const result = transformLegacyLangchainImport('@langchain/classic/chains');
				expect(result).toBe('@langchain/classic/chains');
			});

			it('should return original module name for non-langchain imports', () => {
				const result = transformLegacyLangchainImport('lodash');
				expect(result).toBe('lodash');
			});
		});

		describe('handles edge cases', () => {
			it('should handle langchain/hub imports', () => {
				const result = transformLegacyLangchainImport('langchain/hub');
				expect(result).toBe('@langchain/classic/hub');
			});

			it('should handle langchain/indexes imports', () => {
				const result = transformLegacyLangchainImport('langchain/indexes');
				expect(result).toBe('@langchain/classic/indexes');
			});

			it('should handle langchain/sql_db imports', () => {
				const result = transformLegacyLangchainImport('langchain/sql_db');
				expect(result).toBe('@langchain/classic/sql_db');
			});

			it('should handle langchain/storage/in_memory', () => {
				const result = transformLegacyLangchainImport('langchain/storage/in_memory');
				expect(result).toBe('@langchain/classic/storage/in_memory');
			});

			it('should handle langchain/stores/message/in_memory', () => {
				const result = transformLegacyLangchainImport('langchain/stores/message/in_memory');
				expect(result).toBe('@langchain/classic/stores/message/in_memory');
			});
		});
	});
});
