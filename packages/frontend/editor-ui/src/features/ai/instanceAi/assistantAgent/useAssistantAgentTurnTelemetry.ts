import { INSTANCE_AI_THREAD_SOURCE_FALLBACK, type AgentSseEvent } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { computed, onBeforeUnmount, watch } from 'vue';

import { TIME } from '@/app/constants/durations';

import {
	instanceAiResponseNow,
	observeInstanceAiResponseRender,
} from '../instanceAi.responseTiming';
import type { AssistantAgentSentMessageContext } from './useAssistantAgentMessageTelemetry';

/** Silence window after which an active run with no stream traffic counts as stalled. */
export const GENERATION_STALL_TIMEOUT_MS = TIME.MINUTE;

/**
 * Finish reasons of a run that ended without a reply. The current runtime drops
 * these samples too. A run that shows a card settles on `tool-call-suspended`
 * before it pauses.
 */
const DISCARDED_FINISH_REASONS = new Set(['cancelled', 'error', 'guardrail', 'paused']);

type ResponseKind = 'completed' | 'awaiting_input';

interface SubmittedMessage {
	startedAtEpochMs: number;
	context: AssistantAgentSentMessageContext;
	/** The server queued the message, so its run is still to start. */
	queued: boolean;
}

interface PendingResponse {
	startedAtEpochMs: number;
	context: AssistantAgentSentMessageContext;
	runId: string;
}

/**
 * Sends `User received AI Assistant response` and `Builder generation stalled`
 * for an Assistant agent thread, with the same rules as the current runtime.
 *
 * A user message starts a sample. The run that the server starts for it binds
 * the sample to a run id. The sample ends when the run finishes or shows a card.
 * The stream events carry no send id, so a sample binds only to a send that the
 * server queued or that is still in flight.
 */
export function useAssistantAgentTurnTelemetry(options: {
	threadId: string;
	/** The chat streams a run. */
	isStreaming: () => boolean;
	/** The chat posts a message and the server has not accepted it yet. */
	isSubmitting: () => boolean;
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
		// Two messages wait for a run, and the run events cannot tell them apart.
		if (submitted?.queued) {
			submitted = null;
			return;
		}
		submitted = { startedAtEpochMs: instanceAiResponseNow(), context, queued: false };
	}

	function settle(responseKind: ResponseKind | null): void {
		const response = pending;
		pending = null;
		if (!response || responseKind === null) return;

		void observeInstanceAiResponseRender().then(({ atEpochMs, tabVisible }) => {
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
			case 'message-queued':
				if (submitted) submitted.queued = true;
				return;
			case 'execution-started': {
				// A send that failed before the server queued it leaves a stale sample.
				// Card answers also start runs, so that sample must not bind to them.
				if (submitted && (submitted.queued || options.isSubmitting())) {
					const { startedAtEpochMs, context } = submitted;
					pending = { startedAtEpochMs, context, runId: event.executionId };
				}
				submitted = null;
				return;
			}
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
