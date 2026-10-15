import {
	INLINE_SUB_AGENT_ID,
	parseDelegateSubAgentContinuation,
	type SerializableAgentState,
} from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';

export interface DelegatedChildCheckpoint {
	runId: string;
	agentId: string;
}

export function getDelegatedChildCheckpoints(
	checkpoint: SerializableAgentState,
	parentAgentId: string,
): DelegatedChildCheckpoint[] {
	const childCheckpoints: DelegatedChildCheckpoint[] = [];
	const seen = new Set<string>();

	for (const pendingToolCall of Object.values(checkpoint.pendingToolCalls)) {
		if (!pendingToolCall.suspended) continue;
		const childCheckpoint = parseDelegateSubAgentContinuation(pendingToolCall.continuation);
		if (!childCheckpoint) continue;

		let ownerAgentId: string;
		if (childCheckpoint.resumeContext === undefined) {
			if (childCheckpoint.subAgentId !== INLINE_SUB_AGENT_ID) continue;
			ownerAgentId = parentAgentId;
		} else {
			if (
				!isRecord(childCheckpoint.resumeContext) ||
				typeof childCheckpoint.resumeContext.agentId !== 'string' ||
				childCheckpoint.resumeContext.agentId.length === 0 ||
				(childCheckpoint.resumeContext.versionId !== undefined &&
					(typeof childCheckpoint.resumeContext.versionId !== 'string' ||
						childCheckpoint.resumeContext.versionId.length === 0))
			) {
				continue;
			}
			const expectedOwnerAgentId =
				childCheckpoint.subAgentId === INLINE_SUB_AGENT_ID
					? parentAgentId
					: childCheckpoint.subAgentId;
			if (childCheckpoint.resumeContext.agentId !== expectedOwnerAgentId) continue;
			ownerAgentId = expectedOwnerAgentId;
		}

		const identity = `${ownerAgentId}\0${childCheckpoint.runId}`;
		if (seen.has(identity)) continue;
		seen.add(identity);
		childCheckpoints.push({ runId: childCheckpoint.runId, agentId: ownerAgentId });
	}

	return childCheckpoints;
}
