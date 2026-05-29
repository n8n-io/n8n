import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';

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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getStringProp(record: Record<string, unknown>, key: string): string | undefined {
	const value = record[key];
	return typeof value === 'string' ? value : undefined;
}

function isDirectWorkflowMutationToolCall(tc: InstanceAiToolCallState): boolean {
	const action = getStringProp(tc.args, 'action');
	return tc.toolName === 'workflows' && (action === 'create' || action === 'update');
}

function isWorkflowArtifactToolCall(tc: InstanceAiToolCallState): boolean {
	return (
		isDirectWorkflowMutationToolCall(tc) ||
		tc.toolName === 'build-workflow' ||
		tc.toolName === 'build-workflow-with-agent' ||
		tc.toolName === 'submit-workflow'
	);
}

export function isLegacyBuilderToolCall(tc: InstanceAiToolCallState): boolean {
	return tc.renderHint === 'builder' && !isDirectWorkflowMutationToolCall(tc);
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
		artifacts.push(...extractArtifactsFromToolCall(tc, seenIds));
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

export function extractArtifactsFromToolCall(
	tc: InstanceAiToolCallState,
	seenIds: Set<string> = new Set(),
): ArtifactInfo[] {
	if (!isRecord(tc.result)) return [];
	const result = tc.result;
	const artifacts: ArtifactInfo[] = [];
	const workflowId = getStringProp(result, 'workflowId');

	// Workflow artifacts from workflow create/update
	if (isWorkflowArtifactToolCall(tc) && workflowId && !seenIds.has(workflowId)) {
		seenIds.add(workflowId);
		const name =
			getStringProp(result, 'workflowName') ?? getStringProp(tc.args, 'name') ?? 'Untitled';
		artifacts.push({
			type: 'workflow',
			resourceId: workflowId,
			name,
			completedAt: tc.completedAt,
		});
		return artifacts;
	}

	// Data table artifacts
	let tableId: string | undefined;
	let tableName: string | undefined;
	let tableProjectId: string | undefined;

	tableId = getStringProp(result, 'tableId') ?? tableId;
	tableId = getStringProp(result, 'dataTableId') ?? tableId;
	tableName = getStringProp(result, 'name') ?? tableName;
	tableName = getStringProp(result, 'tableName') ?? tableName;
	tableProjectId = getStringProp(result, 'projectId') ?? tableProjectId;

	const table = result.table;
	if (isRecord(table)) {
		tableId = getStringProp(table, 'id') ?? tableId;
		tableName = getStringProp(table, 'name') ?? tableName;
		tableProjectId = getStringProp(table, 'projectId') ?? tableProjectId;
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

	return artifacts;
}
