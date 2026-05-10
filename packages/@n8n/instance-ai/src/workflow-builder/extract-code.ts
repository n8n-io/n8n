/**
 * Code extraction utilities for workflow SDK code.
 *
 * Adapted from ai-workflow-builder.ee/code-builder/utils/extract-code.ts
 */

import * as path from 'node:path';

/**
 * Comprehensive import statement with all available SDK functions.
 * This is prepended to workflow code so the LLM knows what's available.
 */
export const SDK_IMPORT_STATEMENT =
	"import { workflow, node, trigger, sticky, placeholder, newCredential, ifElse, switchCase, merge, splitInBatches, nextBatch, languageModel, memory, tool, outputParser, embedding, embeddings, vectorStore, retriever, documentLoader, textSplitter, fromAi, expr } from '@n8n/workflow-sdk';";

/** Matches any import statement (single-line, multi-line, side-effect, default, namespace) */
const IMPORT_REGEX = /^\s*import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"];?\s*$/gm;

/**
 * Strip import statements from workflow code.
 * The SDK functions are available as globals, so imports are not needed at runtime.
 */
export function stripImportStatements(code: string): string {
	return code
		.replace(IMPORT_REGEX, '')
		.replace(/^\s*\n/, '') // Remove leading blank line if present
		.trim();
}

/**
 * Strip only SDK imports (@n8n/workflow-sdk), preserving local imports.
 */
export function stripSdkImports(code: string): string {
	const sdkImportRegex = /^\s*import\s+(?:[\s\S]*?from\s+)?['"]@n8n\/workflow-sdk['"];?\s*$/gm;
	return code.replace(sdkImportRegex, '').trim();
}

/**
 * Matches local import statements and captures the specifier.
 * E.g. `import { weatherNode } from './chunks/weather'` → captures `./chunks/weather`
 */
const LOCAL_IMPORT_REGEX = /^\s*import\s+(?:[\s\S]*?from\s+)?['"](\.\.?\/[^'"]+)['"];?\s*$/gm;

/**
 * Resolve local imports from the sandbox filesystem.
 *
 * Finds local import statements (relative paths like `./foo` or `../chunks/bar`),
 * reads each imported file, strips SDK imports and `export` keywords, and inlines
 * the code before the main file's content. The combined result is ready for
 * `parseWorkflowCodeToBuilder()`.
 *
 * Supports one level of nested imports (chunk importing another chunk).
 *
 * @param code - The main workflow file content
 * @param basePath - Directory of the main file (for resolving relative imports)
 * @param readFile - Function to read a file from the sandbox, returns null if not found
 */
export async function resolveLocalImports(
	code: string,
	basePath: string,
	readFile: (filePath: string) => Promise<string | null>,
): Promise<string> {
	const resolved = new Set<string>();
	const inlinedChunks: string[] = [];

	async function resolveFile(fileCode: string, fileDir: string, depth: number): Promise<void> {
		if (depth > 5) return; // Guard against circular imports

		// Find all local imports in this file
		const imports: Array<{ fullMatch: string; specifier: string }> = [];
		let match: RegExpExecArray | null;
		const regex = new RegExp(LOCAL_IMPORT_REGEX.source, 'gm');

		while ((match = regex.exec(fileCode)) !== null) {
			imports.push({ fullMatch: match[0], specifier: match[1] });
		}

		for (const imp of imports) {
			// Resolve the file path — try .ts extension if not present
			let resolvedPath = path.resolve(fileDir, imp.specifier);
			if (!resolvedPath.endsWith('.ts')) {
				resolvedPath += '.ts';
			}

			// Skip if already resolved (dedup)
			if (resolved.has(resolvedPath)) continue;
			resolved.add(resolvedPath);

			const content = await readFile(resolvedPath);
			if (content === null) continue; // Skip missing files silently

			// Recursively resolve imports in the chunk
			await resolveFile(content, path.dirname(resolvedPath), depth + 1);

			// Strip SDK imports and `export` keywords, then add to chunks
			let cleaned = stripSdkImports(content);
			// Remove local imports (already resolved recursively)
			cleaned = cleaned.replace(new RegExp(LOCAL_IMPORT_REGEX.source, 'gm'), '');
			// Remove `export` from declarations: `export const X` → `const X`, `export default` → removed
			cleaned = cleaned.replace(/^export\s+default\s+/gm, '');
			cleaned = cleaned.replace(/^export\s+/gm, '');
			cleaned = cleaned.trim();

			if (cleaned) {
				inlinedChunks.push(cleaned);
			}
		}
	}

	await resolveFile(code, basePath, 0);

	// Remove local imports from the main code
	const mainCode = code.replace(new RegExp(LOCAL_IMPORT_REGEX.source, 'gm'), '');

	if (inlinedChunks.length === 0) {
		return mainCode;
	}

	// Prepend inlined chunks before the main code
	return [...inlinedChunks, mainCode].join('\n\n');
}

/**
 * Extract workflow code from an LLM response.
 *
 * Looks for TypeScript/JavaScript code blocks (```typescript, ```ts, or ```)
 * and extracts the content. If no code block is found, returns the trimmed response.
 * Also strips any import statements since SDK functions are available as globals.
 */
export function extractWorkflowCode(response: string): string {
	// Match ```typescript, ```ts, ```javascript, ```js, or ``` code blocks
	const codeBlockRegex = /```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/;
	const match = response.match(codeBlockRegex);

	if (match) {
		const code = match[1].trim();
		return stripImportStatements(code);
	}

	// Fallback: return trimmed response if no code block found
	return stripImportStatements(response.trim());
}
