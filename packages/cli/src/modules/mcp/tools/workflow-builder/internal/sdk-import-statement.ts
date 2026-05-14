/**
 * Comprehensive import statement with all available SDK functions.
 * This is prepended to workflow code so the LLM knows what's available.
 *
 * Moved here from `@n8n/ai-workflow-builder` so the MCP server has no
 * runtime dependency on the LangChain-based code-builder package.
 */
export const SDK_IMPORT_STATEMENT =
	"import { workflow, node, trigger, sticky, placeholder, newCredential, ifElse, switchCase, merge, splitInBatches, nextBatch, languageModel, memory, tool, outputParser, embedding, embeddings, vectorStore, retriever, documentLoader, textSplitter, reranker, fromAi, expr } from '@n8n/workflow-sdk';";
