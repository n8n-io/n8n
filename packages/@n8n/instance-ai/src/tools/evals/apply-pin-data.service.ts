import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { ToolRefPinData } from './generate-tool-ref-pin-data.service';

/**
 * Returns a new workflow with the generated pinData entries merged in.
 *
 * - If the workflow already has pinData for a given node, the existing entry
 *   is preserved (we never overwrite user-supplied or previously-generated
 *   pinData — re-running setup is idempotent).
 * - If every generated entry was skipped (already-set), the input reference
 *   is returned unchanged so callers can short-circuit a workflow update.
 */
export function applyPinData(workflow: WorkflowJSON, generated: ToolRefPinData): WorkflowJSON {
	const existing = workflow.pinData ?? {};
	const additions: Record<string, Array<{ json: Record<string, unknown> }>> = {};
	for (const [nodeName, items] of Object.entries(generated)) {
		if (nodeName in existing) continue;
		additions[nodeName] = items;
	}
	if (Object.keys(additions).length === 0) return workflow;
	return {
		...workflow,
		pinData: { ...existing, ...additions },
	};
}
