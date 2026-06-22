// ---------------------------------------------------------------------------
// Compile workflow-builder SDK code (captured from a build tool in a trace)
// into workflow JSON, for restoring a seed.
//
// We call @n8n/workflow-sdk directly rather than @n8n/ai-workflow-builder's
// ParseValidateHandler: that package's module graph uses `@/`-aliased imports
// that don't resolve under the eval harness's tsx runtime, whereas
// @n8n/workflow-sdk resolves to built dist. Seeding only needs the JSON — the
// code already built successfully in the source conversation, so the handler's
// extra validation pass isn't needed here.
// ---------------------------------------------------------------------------

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
