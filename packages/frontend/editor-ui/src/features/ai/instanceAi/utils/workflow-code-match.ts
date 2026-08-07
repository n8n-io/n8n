import type {
	InstanceAiRunDebugStep,
	InstanceAiRunDebugWorkflowCodeSnapshot,
} from '@n8n/api-types';

const WORKFLOW_CODE_TOOL_NAMES = new Set(['build-workflow']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isWorkflowCodeToolName(name: string | undefined): boolean {
	return name !== undefined && WORKFLOW_CODE_TOOL_NAMES.has(name);
}

function extractBuildWorkflowToolCallIds(output: Record<string, unknown> | undefined): string[] {
	if (!output || !Array.isArray(output.toolResults)) {
		return [];
	}

	const ids: string[] = [];
	for (const toolResult of output.toolResults) {
		if (!isRecord(toolResult)) continue;

		const name =
			(typeof toolResult.toolName === 'string' && toolResult.toolName) ||
			(typeof toolResult.name === 'string' && toolResult.name) ||
			undefined;
		if (!isWorkflowCodeToolName(name)) continue;

		if (typeof toolResult.toolCallId === 'string') {
			ids.push(toolResult.toolCallId);
		}
	}

	return ids;
}

export function mapWorkflowSnapshotsByToolCallId(
	steps: InstanceAiRunDebugStep[],
	workflowCode: InstanceAiRunDebugWorkflowCodeSnapshot[],
): ReadonlyMap<string, InstanceAiRunDebugWorkflowCodeSnapshot> {
	const map = new Map<string, InstanceAiRunDebugWorkflowCodeSnapshot>();

	for (const snapshot of workflowCode) {
		if (snapshot.toolCallId) {
			map.set(snapshot.toolCallId, snapshot);
		}
	}

	const orderedToolCallIds = steps
		.slice()
		.sort((left, right) => left.stepNumber - right.stepNumber)
		.flatMap((step) => extractBuildWorkflowToolCallIds(step.output));

	let snapshotIndex = 0;
	for (const toolCallId of orderedToolCallIds) {
		if (map.has(toolCallId)) continue;

		while (
			snapshotIndex < workflowCode.length &&
			workflowCode[snapshotIndex]?.toolCallId &&
			map.has(workflowCode[snapshotIndex]?.toolCallId ?? '')
		) {
			snapshotIndex++;
		}

		const snapshot = workflowCode[snapshotIndex];
		if (!snapshot) break;

		map.set(toolCallId, snapshot);
		snapshotIndex++;
	}

	return map;
}

export function getToolCallIdFromMetadata(metadata: unknown): string | undefined {
	if (!isRecord(metadata) || typeof metadata.toolCallId !== 'string') {
		return undefined;
	}

	return metadata.toolCallId;
}
