import { INSTANCE_AI_THREAD_SOURCE_FALLBACK } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import {
	EMPTY_ASSISTANT_MENTION_COUNTS,
	type AssistantMentionCounts,
} from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';

import {
	resolveAuthorship,
	type InstanceAiMessageAuthorship,
	type InstanceAiPrefillPayload,
} from '../prefills';

/** A text that the host sends for the user. Its authorship is final. */
export interface AssistantAgentHostSend {
	text: string;
	authorship: InstanceAiMessageAuthorship;
	mentionCounts?: AssistantMentionCounts;
}

export interface AssistantAgentSendingMessage {
	text: string;
	files: File[];
	clientContext?: Record<string, unknown>;
	isFirstMessage: boolean;
}

/**
 * Sends `User sent builder message` for each message of an Assistant agent
 * thread, with the properties of the current runtime. The host tells who wrote
 * a text before it pre-fills or sends it. The chat reports each send.
 */
export function useAssistantAgentMessageTelemetry(threadId: string) {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	// shortcut: the pre-fill stays until a send is accepted, so a text typed after the user
	// clears the composer reports as an edited pre-fill. Track the draft if that share matters.
	let prefill: InstanceAiPrefillPayload | null = null;
	let hostSend: AssistantAgentHostSend | null = null;

	function takeAuthorship(text: string): Omit<AssistantAgentHostSend, 'text'> {
		// Only the next send can be the host send. A refused host send leaves its text
		// as the user's draft, so that next send is still the host text when it matches.
		const host = hostSend;
		hostSend = null;
		if (host?.text.trim() === text) {
			return { authorship: host.authorship, mentionCounts: host.mentionCounts };
		}
		return { authorship: resolveAuthorship(text, prefill) };
	}

	function trackSend({ text, files, clientContext, isFirstMessage }: AssistantAgentSendingMessage) {
		const { authorship, mentionCounts = EMPTY_ASSISTANT_MENTION_COUNTS } = takeAuthorship(text);
		const isPrefill = authorship.kind === 'prefill';
		const attachments = clientContext?.attachments;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE, {
			thread_id: threadId,
			instance_id: rootStore.instanceId,
			is_first_message: isFirstMessage,
			// shortcut: Assistant agent threads keep no launch source yet; AST-1819 adds it.
			action_source: INSTANCE_AI_THREAD_SOURCE_FALLBACK,
			prefill_type: isPrefill ? authorship.prefillType : null,
			prefill_id: isPrefill ? (authorship.prefillId ?? null) : null,
			prompt_modified: isPrefill ? (authorship.promptModified ?? false) : null,
			mention_counts: mentionCounts,
			attachment_count: files.length + (Array.isArray(attachments) ? attachments.length : 0),
			runtime: 'agents',
		});
	}

	return {
		/** The text that the composer shows now came from a pre-fill. */
		setPrefill(next: InstanceAiPrefillPayload | null) {
			prefill = next;
		},
		/** Call before the host sends a text for the user. */
		expectHostSend(send: AssistantAgentHostSend) {
			hostSend = send;
		},
		/** The composer is empty after an accepted send. */
		onMessageAccepted() {
			prefill = null;
		},
		trackSend,
	};
}
