// Compile build-tool SDK code into workflow JSON for a seed. Uses
// @n8n/workflow-sdk directly (resolves to built dist) rather than
// @n8n/ai-workflow-builder's handler, whose `@/`-aliased source doesn't resolve
// under the eval harness's tsx runtime. Seeding only needs the JSON.

import { parseWorkflowCodeToBuilder } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

/** Matches any import statement — SDK functions are globals when parsed. */
const IMPORT_REGEX = /^\s*import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"];?\s*$/gm;

function stripImportStatements(code: string): string {
	return code
		.replace(IMPORT_REGEX, '')
		.replace(/^\s*\n/, '')
		.trim();
}

export function parseSeedWorkflowCode(code: string): { workflow: WorkflowJSON } {
	const builder = parseWorkflowCodeToBuilder(stripImportStatements(code));
	// Deterministic node ids across re-parses, matching how the builder persists.
	builder.regenerateNodeIds();
	return { workflow: builder.toJSON({ tidyUp: true }) };
}
