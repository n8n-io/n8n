import type { InstanceAiThreadTabRef } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

/** An artifact that a tool call created or changed, as far as the call tells. */
export type ArtifactTabChange = InstanceAiThreadTabRef & { name?: string; projectId?: string };

const WORKFLOW_BUILD_TOOLS = new Set(['build-workflow', 'submit-workflow']);

/** Tools whose calls can change an artifact. Other tool calls never open a tab. */
export const ARTIFACT_TAB_TOOLS: ReadonlySet<string> = new Set([
	...WORKFLOW_BUILD_TOOLS,
	'workflows',
	'data-tables',
	'build-agent',
]);
const WORKFLOW_MUTATING_ACTIONS = new Set(['update', 'restore-version', 'setup']);

/** Per-action check that a `data-tables` result refers to the table it worked on. */
const DATA_TABLE_RESULT_CHECKS: Record<string, (result: Record<string, unknown>) => boolean> = {
	schema: (r) => Array.isArray(r.columns),
	query: (r) => Array.isArray(r.data),
	'insert-rows': (r) => typeof r.insertedCount === 'number',
	'update-rows': (r) => typeof r.updatedCount === 'number',
	'add-column': (r) => isRecord(r.column),
	'delete-rows': (r) => r.success === true,
	'delete-column': (r) => r.success === true,
	'rename-column': (r) => r.success === true,
};

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function getDataTableChange(
	args: Record<string, unknown>,
	result: Record<string, unknown>,
): ArtifactTabChange | undefined {
	const action = args.action;
	if (action === 'create') {
		if (!isRecord(result.table)) return undefined;
		const id = optionalString(result.table.id);
		if (!id) return undefined;
		const name = optionalString(result.table.name);
		const projectId = optionalString(result.table.projectId);
		return {
			type: 'data-table',
			id,
			...(name ? { name } : {}),
			...(projectId ? { projectId } : {}),
		};
	}

	const check = typeof action === 'string' ? DATA_TABLE_RESULT_CHECKS[action] : undefined;
	if (!check?.(result)) return undefined;
	const id = optionalString(result.dataTableId) ?? optionalString(args.dataTableId);
	return id ? { type: 'data-table', id } : undefined;
}

function getAgentChange(
	args: Record<string, unknown>,
	result: Record<string, unknown>,
): ArtifactTabChange | undefined {
	const id = optionalString(result.agentId);
	if (!id) return undefined;
	const changed =
		result.agentChange === 'created' ||
		result.agentChange === 'updated' ||
		// Results from before `agentChange` existed.
		(result.agentChange === undefined &&
			((result.ok === true && typeof args.name === 'string') || result.configUpdated === true));
	if (!changed) return undefined;
	const name = optionalString(result.agentName);
	return { type: 'agent', id, ...(name ? { name } : {}) };
}

/**
 * The artifact that a successful tool call created or changed, or `undefined`.
 * This is the set of calls that open an artifact tab in the frontend during a
 * live run (see `canvasPreview.utils.ts` in editor-ui). Keep the two in step.
 */
export function getArtifactTabChange(
	toolName: string,
	args: Record<string, unknown>,
	result: unknown,
): ArtifactTabChange | undefined {
	if (!isRecord(result)) return undefined;

	if (WORKFLOW_BUILD_TOOLS.has(toolName)) {
		const id = result.success === true ? optionalString(result.workflowId) : undefined;
		if (!id) return undefined;
		const name = optionalString(result.workflowName);
		return { type: 'workflow', id, ...(name ? { name } : {}) };
	}

	if (toolName === 'workflows') {
		if (typeof args.action !== 'string' || !WORKFLOW_MUTATING_ACTIONS.has(args.action)) {
			return undefined;
		}
		const id = result.success === true ? optionalString(args.workflowId) : undefined;
		return id ? { type: 'workflow', id } : undefined;
	}

	if (toolName === 'data-tables') return getDataTableChange(args, result);
	if (toolName === 'build-agent') return getAgentChange(args, result);
	return undefined;
}
