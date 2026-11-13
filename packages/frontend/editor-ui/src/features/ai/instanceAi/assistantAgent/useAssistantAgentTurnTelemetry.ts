import { INSTANCE_AI_THREAD_SOURCE_FALLBACK, type AgentSseEvent } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { computed, nextTick, onBeforeUnmount, watch } from 'vue';

import { TIME } from '@/app/constants/durations';
import type { AssistantMentionCounts } from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';

import { instanceAiResponseNow } from '../instanceAi.responseTiming';

/** Silence window after which an active run with no stream traffic counts as stalled. */
export const GENERATION_STALL_TIMEOUT_MS = TIME.MINUTE;

/**
 * Finish reasons of a run that ended without a reply. The current runtime drops
 * these samples too. A run that shows a card settles on `tool-call-suspended`
 * before it pauses.
 */
const DISCARDED_FINISH_REASONS = new Set(['cancelled', 'error', 'guardrail', 'paused']);

type ResponseKind = 'completed' | 'awaiting_input';

/** The context of the user message that starts a run, as `User sent builder message` reports it. */
export interface AssistantAgentSentMessageContext {
	isFirstMessage: boolean;
	mentionCounts: AssistantMentionCounts;
	attachmentCount: number;
	selectedElementCount: number;
}

interface SubmittedMessage {
	startedAtEpochMs: number;
	context: AssistantAgentSentMessageContext;
}

interface PendingResponse extends SubmittedMessage {
	runId: string;
}

/**
 * Sends `User received AI Assistant response` and `Builder generation stalled`
 * for an Assistant agent thread, with the same rules as the current runtime.
 *
 * A user message starts a sample. The run that the server starts for it binds
 * the sample to a run id. The sample ends when the run finishes or shows a card.
 */
export function useAssistantAgentTurnTelemetry(options: {
	threadId: string;
	/** The chat streams a run. */
	isStreaming: () => boolean;
	/** The chat shows a card that the run waits on. */
	hasOpenInteraction: () => boolean;
}) {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	let submitted: SubmittedMessage | null = null;
	let pending: PendingResponse | null = null;
	let disposed = false;

	/** Call when the chat sends a user message. */
	function trackSubmit(context: AssistantAgentSentMessageContext): void {
		// A message sent during a run steers that run, so it gets no reply of its own.
		if (options.isStreaming()) return;
		submitted = { startedAtEpochMs: instanceAiResponseNow(), context };
	}

	async function observeRender(): Promise<{ atEpochMs: number; tabVisible: boolean }> {
		await nextTick();
		const tabVisible = document.visibilityState === 'visible';
		if (tabVisible) {
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		}
		return { atEpochMs: instanceAiResponseNow(), tabVisible };
	}

	function settle(responseKind: ResponseKind | null): void {
		const response = pending;
		pending = null;
		if (!response || responseKind === null) return;

		void observeRender().then(({ atEpochMs, tabVisible }) => {
			if (disposed) return;
			const { context } = response;
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_RECEIVED_AI_ASSISTANT_RESPONSE, {
				instance_id: rootStore.instanceId,
				thread_id: options.threadId,
				run_id: response.runId,
				latency_ms: Math.max(0, Math.round(atEpochMs - response.startedAtEpochMs)),
				is_first_user_message: context.isFirstMessage,
				response_kind: responseKind,
				// shortcut: Assistant agent threads keep no launch source yet; AST-1819 adds it.
				action_source: INSTANCE_AI_THREAD_SOURCE_FALLBACK,
				tab_visible: tabVisible,
				mention_counts: context.mentionCounts,
				attachment_count: context.attachmentCount,
				selected_element_count: context.selectedElementCount,
				runtime: 'agents',
			});
		});
	}

	function handleResponseEvent(event: AgentSseEvent): void {
		switch (event.type) {
			case 'execution-started':
				if (!submitted) return;
				pending = { ...submitted, runId: event.executionId };
				submitted = null;
				return;
			case 'message-steered':
				// The server added the message to a run that was already in progress.
				submitted = null;
				return;
			case 'tool-call-suspended':
				settle('awaiting_input');
				return;
			case 'finish':
				settle(DISCARDED_FINISH_REASONS.has(event.finishReason) ? null : 'completed');
				return;
			case 'error':
				submitted = null;
				settle(null);
				return;
			case 'done':
				// The stream ended without a reply that the user can see.
				settle(null);
				return;
			default:
				return;
		}
	}

	// --- 'Builder generation stalled' ---
	// Fires when the active run has sent nothing on the stream for a minute. A run
	// that shows a card is not stalled. Each stream event restarts the countdown,
	// so the event fires at most once for each silent period.
	let stallTimer: ReturnType<typeof setTimeout> | null = null;

	const isGenerationPending = computed(
		() => options.isStreaming() && !options.hasOpenInteraction(),
	);

	function disarmStallWatchdog(): void {
		if (stallTimer === null) return;
		clearTimeout(stallTimer);
		stallTimer = null;
	}

	function resetStallWatchdog(): void {
		disarmStallWatchdog();
		if (disposed || !isGenerationPending.value) return;
		stallTimer = setTimeout(() => {
			stallTimer = null;
			telemetry.track('Builder generation stalled', {
				thread_id: options.threadId,
				runtime: 'agents',
			});
		}, GENERATION_STALL_TIMEOUT_MS);
	}

	// Arms the countdown when a run starts before its stream sends anything, the main stall case.
	watch(isGenerationPending, resetStallWatchdog);

	onBeforeUnmount(() => {
		disposed = true;
		disarmStallWatchdog();
	});

	return {
		trackSubmit,
		/** Call with each event of the chat stream, as received. */
		handleStreamEvent(event: AgentSseEvent): void {
			handleResponseEvent(event);
			resetStallWatchdog();
		},
	};
}
