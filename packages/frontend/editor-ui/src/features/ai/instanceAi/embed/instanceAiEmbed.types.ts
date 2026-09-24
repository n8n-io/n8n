import { isRecord } from '@n8n/utils/is-record';
import type { InstanceAiAgentAttachment } from '@n8n/api-types';

import { INSTANCE_AI_AGENT_BUILDER_TARGETS_METADATA_KEY } from '../constants';
import {
	getAgentBuilderTargetFromThreadMetadata,
	getPendingAgentTargetFromThreadMetadata,
} from '../instanceAi.threadRuntime';

/**
 * A resource an embedded `InstanceAiChatPanel` is scoped to: which thread(s) it
 * shows in its history list, and (for a pending agent) what a newly minted
 * thread should bind to. The agent variant IS the api-types agent attachment —
 * `InstanceAiChatPanel` passes it straight through to `stashPendingAgentAttachment`.
 * `workflow` is the follow-up host (`NodeView`) — see `threadTargetsSubject` below.
 */
export type InstanceAiEmbedSubject =
	| InstanceAiAgentAttachment
	| { type: 'workflow'; id: string; projectId: string; name?: string };

/**
 * Does this thread belong to the subject's history list? A thread targets an
 * agent when it's the thread's bound target, its pending target, or any entry
 * of the session's target registry (every agent the model has addressed in
 * this conversation).
 */
export function threadTargetsSubject(
	metadata: Record<string, unknown> | undefined,
	subject: InstanceAiEmbedSubject,
): boolean {
	if (subject.type === 'workflow') {
		// TODO(AGENT-810 follow-up): workflows have no thread-metadata binding key
		// yet (see plan §7 / NodeView host) — always excluded until that lands.
		return false;
	}

	if (getAgentBuilderTargetFromThreadMetadata(metadata)?.agentId === subject.id) return true;
	if (getPendingAgentTargetFromThreadMetadata(metadata)?.agentId === subject.id) return true;

	const registry = metadata?.[INSTANCE_AI_AGENT_BUILDER_TARGETS_METADATA_KEY];
	if (!isRecord(registry)) return false;
	return Object.values(registry).some((entry) => isRecord(entry) && entry.agentId === subject.id);
}
