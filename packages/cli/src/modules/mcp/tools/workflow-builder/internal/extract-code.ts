/**
 * Strip import statements from workflow code.
 *
 * Moved here from `@n8n/ai-workflow-builder` so the MCP server has no
 * runtime dependency on the LangChain-based code-builder package.
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
