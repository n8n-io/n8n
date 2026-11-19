import type { AssistantPreferenceCard, InstanceAiToolCallState } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { isRecord } from '@n8n/utils/is-record';
import { defineAsyncComponent, reactive, type DeepReadonly, type InjectionKey } from 'vue';

import type { AgentsChatInteractionExtension } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';

import {
	isRejectedPreferenceResult,
	isSavedPreferenceResult,
	SAVE_USER_PREFERENCE_TOOL_NAME,
} from '../preferenceCard.utils';
import type { PreferenceCardHost } from '../preferenceCardHost';
import {
	editAssistantPreferenceCard,
	fetchAssistantPreferenceCards,
	undoAssistantPreferenceCard,
} from './assistantPreferenceCards.api';

/** The preference cards of the open Assistant agent thread. */
export interface AssistantPreferenceCards {
	/** What the user did on the card of a call, or `undefined` when the tool result is the state. */
	get(toolCallId: string): AssistantPreferenceCard | undefined;
	/** Loads the stored cards once. A card calls it when it mounts, so a thread without cards loads nothing. */
	load(): Promise<void>;
	/** True when the call is in the last message of the thread. Only that card may edit. */
	isLatest(toolCallId: string): boolean;
	host: PreferenceCardHost;
}

export const ASSISTANT_PREFERENCE_CARDS: InjectionKey<AssistantPreferenceCards> = Symbol(
	'assistantPreferenceCards',
);

/**
 * The card state of an Assistant agent thread. The server stores what the user
 * did on a card in the thread metadata, because the Agents runtime cannot add
 * a fact to a turn that ended. The card applies the state that the endpoints
 * return, so it changes at once.
 */
export function useAssistantPreferenceCards({
	threadId,
	projectId,
	messages,
}: {
	threadId: string;
	projectId: string;
	messages: () => ReadonlyArray<ChatMessage | DeepReadonly<ChatMessage>>;
}): AssistantPreferenceCards {
	const rootStore = useRootStore();
	const cards = reactive(new Map<string, AssistantPreferenceCard>());
	let loading: Promise<void> | undefined;

	async function load(): Promise<void> {
		loading ??= fetchAssistantPreferenceCards(rootStore.restApiContext, threadId).then(
			(response) => {
				for (const [toolCallId, card] of Object.entries(response.cards)) {
					// A card that the user changed in this tab is newer than the stored one.
					if (!cards.has(toolCallId)) cards.set(toolCallId, card);
				}
			},
			// Without the stored state, each card shows its tool result. The next card mount retries.
			() => {
				loading = undefined;
			},
		);
		await loading;
	}

	function isLatest(toolCallId: string): boolean {
		const all = messages();
		const last = all[all.length - 1];
		if (last?.role !== 'assistant') return false;
		return last.toolCalls?.some((call) => call.toolCallId === toolCallId) === true;
	}

	const host: PreferenceCardHost = {
		projectId: () => projectId,
		async undo({ preferenceId, toolCallId }) {
			const { card } = await undoAssistantPreferenceCard(
				rootStore.restApiContext,
				threadId,
				preferenceId,
				{ toolCallId },
			);
			if (!card) return false;
			cards.set(toolCallId, card);
			return true;
		},
		async edit({ preferenceId, toolCallId }, edit) {
			const { card, preference } = await editAssistantPreferenceCard(
				rootStore.restApiContext,
				threadId,
				preferenceId,
				{ toolCallId, ...edit },
			);
			if (!card || !preference) return null;
			cards.set(toolCallId, card);
			return preference;
		},
	};

	return { get: (toolCallId) => cards.get(toolCallId), load, isLatest, host };
}

/** True for a `save_user_preference` result that the card shows: a saved row or a refused write. */
export function isPreferenceCardToolCall(toolCall: ToolCall): boolean {
	return (
		toolCall.tool === SAVE_USER_PREFERENCE_TOOL_NAME &&
		(isSavedPreferenceResult(toolCall.output) || isRejectedPreferenceResult(toolCall.output))
	);
}

/**
 * The call in the shape of the current Assistant chat, so both chats render
 * the same card. The stored card state takes the place of the `preference-card` fact.
 */
export function toPreferenceCardToolCall(
	toolCall: ToolCall,
	card: AssistantPreferenceCard | undefined,
): InstanceAiToolCallState {
	return {
		toolCallId: toolCall.toolCallId,
		toolName: toolCall.tool,
		args: isRecord(toolCall.input) ? toolCall.input : {},
		result: toolCall.output,
		isLoading: false,
		...(card && {
			preferenceCard: {
				state: card.state,
				content: card.content,
				scope: card.scope,
				projectId: card.projectId,
			},
		}),
	};
}

/**
 * The card of a preference that the assistant saved, or failed to save, in
 * place of the tool step. A call that threw keeps the default tool step.
 */
export const assistantPreferenceCardExtension: AgentsChatInteractionExtension = {
	key: 'assistant_preference_card',
	matchToolResult: isPreferenceCardToolCall,
	resultComponent: defineAsyncComponent(
		async () => await import('./AssistantPreferenceCardResult.vue'),
	),
};
