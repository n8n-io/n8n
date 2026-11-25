import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, type DeepReadonly } from 'vue';

import { CHAT_MESSAGE_ROLE } from '@/features/ai/shared/agentsChat/constants';
import { isStoppedMessage } from '@/features/ai/shared/agentsChat/messageMappers';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';

import {
	postAssistantAgentFeedback,
	type AssistantAgentRating,
} from './assistantAgentFeedback.api';

/**
 * Lets the user rate the latest answer of an Assistant agent thread, like the
 * current Assistant runtime. The execution of the turn identifies the answer.
 * The server sends the rating to the LangSmith trace of the turn.
 */
export function useAssistantAgentFeedback({
	threadId,
	messages,
}: {
	threadId: string;
	messages: () => ReadonlyArray<ChatMessage | DeepReadonly<ChatMessage>>;
}) {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const ratings = ref<Record<string, AssistantAgentRating>>({});

	/**
	 * The execution of the latest answer. A message that the user sent after it
	 * hides it. Like the current runtime, a turn that the user stopped has no rating.
	 */
	const latestAnswerExecutionId = computed(() => {
		const list = messages();
		const last = list[list.length - 1];
		if (last?.role !== CHAT_MESSAGE_ROLE.ASSISTANT || isStoppedMessage(last)) return undefined;
		return last.executionId;
	});

	/** Whether the answer of this execution is the one that the user can rate. */
	function isRateable(executionId: string | undefined): executionId is string {
		return executionId !== undefined && executionId === latestAnswerExecutionId.value;
	}

	function ratingOf(executionId: string | undefined): AssistantAgentRating | undefined {
		return executionId === undefined ? undefined : ratings.value[executionId];
	}

	function rate(executionId: string, rating: AssistantAgentRating): void {
		if (!isRateable(executionId) || ratings.value[executionId]) return;
		ratings.value[executionId] = rating;
		telemetry.track('User rated workflow generation', {
			thread_id: threadId,
			response_id: executionId,
			helpful: rating === 'up',
			runtime: 'agents',
		});
		// A failed send must not change what the user sees.
		void postAssistantAgentFeedback(rootStore.restApiContext, threadId, {
			executionId,
			rating,
		}).catch(() => {});
	}

	return { isRateable, ratingOf, rate };
}
