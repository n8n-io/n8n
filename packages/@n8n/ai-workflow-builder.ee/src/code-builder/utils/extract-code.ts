/**
 * Comprehensive import statement with all available SDK functions.
 * This is prepended to workflow code so the LLM knows what's available.
 */
export const SDK_IMPORT_STATEMENT =
	"import { workflow, node, trigger, sticky, placeholder, newCredential, ifElse, switchCase, merge, splitInBatches, nextBatch, languageModel, memory, tool, outputParser, embedding, embeddings, vectorStore, retriever, documentLoader, textSplitter, reranker, fromAi, expr } from '@n8n/workflow-sdk';";

/**
 * Strip import statements from workflow code.
 * The SDK functions are available as globals, so imports are not needed at runtime.
 */
export function stripImportStatements(code: string): string {
	// Match import statements - handles:
	// - Single line: import { x } from 'y';
	// - Multi-line: import {\n  x,\n  y\n} from 'z';
	// - Side-effect: import 'module';
	// - Default: import x from 'y';
	// - Namespace: import * as x from 'y';
	const importRegex = /^\s*import\s+(?:[\s\S]*?from\s+)?['"][^'"]+['"];?\s*$/gm;

	return code
		.replace(importRegex, '')
		.replace(/^\s*\n/, '') // Remove leading blank line if present
		.trim();
}

/**
 * Extract workflow code from an LLM response.
 *
 * Looks for TypeScript/JavaScript code blocks (```typescript, ```ts, or ```)
 * and extracts the content. If no code block is found, returns the trimmed response.
 * Also strips any import statements since SDK functions are available as globals.
 *
 * @param response - The LLM response that may contain code in a code block
 * @returns The extracted code, trimmed
 */
export function extractWorkflowCode(response: string): string {
	// Match ```typescript, ```ts, ```javascript, ```js, or ``` code blocks
	// Use non-greedy match to get first code block
	const codeBlockRegex = /```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/;
	const match = response.match(codeBlockRegex);

	if (match) {
		const code = match[1].trim();
		return stripImportStatements(code);
	}

	// Fallback: return trimmed response if no code block found
	return stripImportStatements(response.trim());
}
