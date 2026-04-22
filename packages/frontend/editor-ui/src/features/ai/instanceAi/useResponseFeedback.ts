import { ref, computed, type Ref } from 'vue';
import { isSafeObjectKey } from '@n8n/api-types';
import type { InstanceAiMessage, InstanceAiAgentNode } from '@n8n/api-types';
import type { RatingFeedback } from '@n8n/design-system';
import type { ITelemetryTrackProperties } from 'n8n-workflow';

// ---------------------------------------------------------------------------
// Tree traversal helpers (pure functions)
// ---------------------------------------------------------------------------

function hasActiveAgent(node: InstanceAiAgentNode): boolean {
	if (node.status === 'active') return true;
	return node.children.some((child) => hasActiveAgent(child));
}

function hasLoadingToolCall(node: InstanceAiAgentNode): boolean {
	if (node.toolCalls.some((tc) => tc.isLoading)) return true;
	return node.children.some((child) => hasLoadingToolCall(child));
}

function hasPendingConfirmation(node: InstanceAiAgentNode): boolean {
	if (node.toolCalls.some((tc) => tc.confirmation && tc.confirmationStatus === 'pending'))
		return true;
	return node.children.some((child) => hasPendingConfirmation(child));
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

interface UseResponseFeedbackOptions {
	messages: Ref<InstanceAiMessage[]>;
	currentThreadId: Ref<string>;
	telemetry: { track: (event: string, props?: ITelemetryTrackProperties) => void };
	/**
	 * Optional remote callback invoked alongside telemetry to annotate the
	 * LangSmith trace for the rated response. Fire-and-forget: errors are
	 * swallowed so a LangSmith outage never blocks the UI.
	 */
	postFeedback?: (
		threadId: string,
		responseId: string,
		payload: { rating: 'up' | 'down'; comment?: string },
	) => Promise<void>;
}

export function useResponseFeedback({
	messages,
	currentThreadId,
	telemetry,
	postFeedback,
}: UseResponseFeedbackOptions) {
	const feedbackByResponseId = ref<Record<string, RatingFeedback>>({});
	// Tracks the last-known rating per response for LangSmith upsert merging.
	// Kept separate from `feedbackByResponseId` which only records submitted
	// (non-pending) feedback for UI state.
	const ratingByResponseId = new Map<string, 'up' | 'down'>();

	/**
	 * Computes the one currently rateable response identity for the thread.
	 * Uses `messageGroupId ?? id` as the response identity.
	 *
	 * A response is rateable only when:
	 * - It is the latest assistant response group
	 * - No user message exists after it
	 * - The response is no longer streaming
	 * - No agent in the tree is still active
	 * - No tool call in the tree is still loading
	 * - No confirmation/input request is pending
	 * - The final state is `completed` or a settled `error` (not cancelled)
	 */
	const rateableResponseId = computed((): string | null => {
		let lastAssistantIdx = -1;
		for (let i = messages.value.length - 1; i >= 0; i--) {
			if (messages.value[i].role === 'assistant') {
				lastAssistantIdx = i;
				break;
			}
		}
		if (lastAssistantIdx === -1) return null;

		const lastAssistant = messages.value[lastAssistantIdx];

		// No user message after the latest assistant response
		for (let i = lastAssistantIdx + 1; i < messages.value.length; i++) {
			if (messages.value[i].role === 'user') return null;
		}

		if (lastAssistant.isStreaming) return null;

		const tree = lastAssistant.agentTree;
		if (tree) {
			if (hasActiveAgent(tree)) return null;
			if (hasLoadingToolCall(tree)) return null;
			if (hasPendingConfirmation(tree)) return null;

			if (tree.status === 'cancelled') return null;
			if (tree.status !== 'completed' && tree.status !== 'error') return null;
		}

		return lastAssistant.messageGroupId ?? lastAssistant.id;
	});

	/**
	 * Submit response feedback (rating or text). Saves locally and emits telemetry.
	 *
	 * For thumbs-up: records immediately as submitted (final action).
	 * For thumbs-down: emits telemetry but does NOT mark as submitted yet
	 * (the user may still type text feedback or cancel).
	 * For text feedback: records as submitted (final action after thumbs-down).
	 */
	function submitFeedback(responseId: string, payload: RatingFeedback): void {
		if (!isSafeObjectKey(responseId)) return;

		if (payload.rating) {
			telemetry.track('User rated workflow generation', {
				thread_id: currentThreadId.value,
				response_id: responseId,
				helpful: payload.rating === 'up',
			});

			if (payload.rating === 'up') {
				feedbackByResponseId.value[responseId] = payload;
			}
		}

		if (payload.feedback !== undefined) {
			telemetry.track('User submitted workflow generation feedback', {
				thread_id: currentThreadId.value,
				response_id: responseId,
				feedback: payload.feedback,
			});

			feedbackByResponseId.value[responseId] = {
				...feedbackByResponseId.value[responseId],
				...payload,
			};
		}

		if (payload.rating) {
			ratingByResponseId.set(responseId, payload.rating);
		}

		// Fan out to LangSmith trace annotation. Fire-and-forget: merge the
		// remembered rating with any new comment text so the backend can upsert a
		// single feedback record regardless of which signal arrived first.
		if (postFeedback) {
			const rating = payload.rating ?? ratingByResponseId.get(responseId);
			if (rating) {
				void postFeedback(currentThreadId.value, responseId, {
					rating,
					...(payload.feedback !== undefined ? { comment: payload.feedback } : {}),
				}).catch(() => {
					// Intentionally swallowed — LangSmith outages must never break the UI.
				});
			}
		}
	}

	/** Clear all feedback state (e.g. on thread switch). */
	function resetFeedback(): void {
		feedbackByResponseId.value = {};
		ratingByResponseId.clear();
	}

	return {
		feedbackByResponseId,
		rateableResponseId,
		submitFeedback,
		resetFeedback,
	};
}
