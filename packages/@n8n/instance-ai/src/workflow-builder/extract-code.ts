/**
 * Comprehensive import statement with all available SDK functions.
 * Prepended to workflow code so the LLM knows what's available.
 */
export const SDK_IMPORT_STATEMENT =
	"import { workflow, node, trigger, sticky, placeholder, newCredential, ifElse, switchCase, merge, splitInBatches, nextBatch, languageModel, memory, tool, outputParser, embedding, embeddings, vectorStore, retriever, documentLoader, textSplitter, fromAi, expr } from '@n8n/workflow-sdk';";
