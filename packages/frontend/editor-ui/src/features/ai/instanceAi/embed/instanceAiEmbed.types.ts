import { isRecord } from '@n8n/utils/is-record';
import type { InstanceAiAgentAttachment } from '@n8n/api-types';
import type { ComputedRef, InjectionKey } from 'vue';

import { INSTANCE_AI_AGENT_BUILDER_TARGETS_METADATA_KEY } from '../constants';
import {
	getAppTargetsFromThreadMetadata,
	getAgentBuilderTargetFromThreadMetadata,
	getPendingAgentTargetFromThreadMetadata,
	getPendingAppTargetFromThreadMetadata,
} from '../instanceAi.threadRuntime';

/**
 * A resource an embedded `InstanceAiChatPanel` is scoped to: which thread(s) it
 * shows in its history list, and what a newly minted thread should bind to. The
 * agent variant IS the api-types agent attachment — `InstanceAiChatPanel` passes
 * it straight through to `stashPendingAgentAttachment`. `workflow` is the
 * follow-up host (`NodeView`) — see `threadTargetsSubject` below.
 */
export type InstanceAiEmbedSubject =
	| InstanceAiAgentAttachment
	| { type: 'app'; id: string; projectId: string; name?: string; pending?: true }
	| { type: 'workflow'; id: string; projectId: string; name?: string };

/**
 * The resource the host page is showing beside the embedded panel. The
 * conversation renders references to it as plain text and skips its artifact
 * card: the user is already looking at it.
 */
export const INSTANCE_AI_EMBED_SUBJECT_KEY: InjectionKey<ComputedRef<InstanceAiEmbedSubject>> =
	Symbol('instanceAiEmbedSubject');

export function isEmbedSubject(
	subject: InstanceAiEmbedSubject | undefined,
	type: string,
	id: string,
): boolean {
	return subject?.type === type && subject.id === id;
}

/**
 * Does this thread belong to the subject's history list? A thread targets an
 * subject when it is a bound target or a pending target. Agents also match any
 * entry in the session's target registry.
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
	if (subject.type === 'app') {
		if (getPendingAppTargetFromThreadMetadata(metadata)?.appId === subject.id) return true;
		return getAppTargetsFromThreadMetadata(metadata).some(({ appId }) => appId === subject.id);
	}

	if (getAgentBuilderTargetFromThreadMetadata(metadata)?.agentId === subject.id) return true;
	if (getPendingAgentTargetFromThreadMetadata(metadata)?.agentId === subject.id) return true;

	const registry = metadata?.[INSTANCE_AI_AGENT_BUILDER_TARGETS_METADATA_KEY];
	if (!isRecord(registry)) return false;
	return Object.values(registry).some((entry) => isRecord(entry) && entry.agentId === subject.id);
}
