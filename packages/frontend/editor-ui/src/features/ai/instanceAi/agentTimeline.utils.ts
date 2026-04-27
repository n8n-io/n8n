import type { InstanceAiAgentNode } from '@n8n/api-types';

/** Tool calls that are internal bookkeeping and should not be shown to the user. */
export const HIDDEN_TOOLS = new Set(['updateWorkingMemory']);

export interface ArtifactInfo {
	type: 'workflow' | 'data-table';
	resourceId: string;
	name: string;
	projectId?: string;
	/** ISO timestamp of the tool call that produced this artifact. */
	completedAt?: string;
}

/** Extract all artifacts (workflows and data tables) from a node's tool calls. */
export function extractArtifacts(node: InstanceAiAgentNode): ArtifactInfo[] {
	if (node.status !== 'completed') return [];

	const artifacts: ArtifactInfo[] = [];
	const seenIds = new Set<string>();

	// Check targetResource first (single-workflow agents)
	if (node.targetResource?.id && node.targetResource.type) {
		const type = node.targetResource.type;
		if (type === 'workflow' || type === 'data-table') {
			seenIds.add(node.targetResource.id);
			artifacts.push({
				type,
				resourceId: node.targetResource.id,
				name: node.targetResource.name ?? node.subtitle ?? 'Untitled',
				completedAt: undefined,
			});
		}
	}

	// Scan tool calls for additional artifacts
	for (const tc of node.toolCalls) {
		if (!tc.result || typeof tc.result !== 'object') continue;
		const result = tc.result as Record<string, unknown>;

		// Workflow artifacts from build-workflow / submit-workflow
		if (
			(tc.toolName === 'build-workflow' || tc.toolName === 'submit-workflow') &&
			typeof result.workflowId === 'string' &&
			!seenIds.has(result.workflowId)
		) {
			seenIds.add(result.workflowId);
			const name =
				(typeof result.workflowName === 'string' ? result.workflowName : undefined) ??
				(typeof (tc.args as Record<string, unknown>)?.name === 'string'
					? ((tc.args as Record<string, unknown>).name as string)
					: undefined) ??
				'Untitled';
			artifacts.push({
				type: 'workflow',
				resourceId: result.workflowId,
				name,
				completedAt: tc.completedAt,
			});
			continue;
		}

		// Data table artifacts
		let tableId: string | undefined;
		let tableName: string | undefined;
		let tableProjectId: string | undefined;

		if (typeof result.tableId === 'string') tableId = result.tableId;
		if (typeof result.dataTableId === 'string') tableId = result.dataTableId;
		if (typeof result.name === 'string') tableName = result.name;
		if (typeof result.tableName === 'string') tableName = result.tableName;
		if (typeof result.projectId === 'string') tableProjectId = result.projectId;

		const table = result.table;
		if (table && typeof table === 'object') {
			const t = table as Record<string, unknown>;
			if (typeof t.id === 'string') tableId = t.id;
			if (typeof t.name === 'string') tableName = t.name;
			if (typeof t.projectId === 'string') tableProjectId = t.projectId;
		}

		if (tableId && !seenIds.has(tableId)) {
			seenIds.add(tableId);
			artifacts.push({
				type: 'data-table',
				resourceId: tableId,
				name: tableName ?? 'Untitled',
				projectId: tableProjectId,
				completedAt: tc.completedAt,
			});
		}
	}

	// Recurse into children
	for (const child of node.children) {
		for (const artifact of extractArtifacts(child)) {
			if (!seenIds.has(artifact.resourceId)) {
				seenIds.add(artifact.resourceId);
				artifacts.push(artifact);
			}
		}
	}

	return artifacts;
}
