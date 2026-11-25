import {
	mergeAssistantPreferenceCard,
	type AssistantPreferenceCard,
	type InstanceAiToolCallState,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { isRecord } from '@n8n/utils/is-record';
import { defineAsyncComponent, reactive, type DeepReadonly, type InjectionKey } from 'vue';

import { isContextPreferencesEnabled } from '@/features/settings/context/context.utils';
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
	/**
	 * True when the call is in the last turn of the thread: any message after the
	 * last user message. The chat starts a message for each model step, so a
	 * turn can have many. Only cards in the last turn may edit.
	 */
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
	// The chat mounts a card again when the history refetch replaces the streamed message.
	const reportedSeen = new Set<string>();
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
		const turnStart = all.findLastIndex((message) => message.role === 'user') + 1;
		return all
			.slice(turnStart)
			.some((message) => message.toolCalls?.some((call) => call.toolCallId === toolCallId));
	}

	/** The server returns the merged card. Merging again keeps the edited text if it did not. */
	function apply(card: AssistantPreferenceCard): void {
		cards.set(card.toolCallId, mergeAssistantPreferenceCard(cards.get(card.toolCallId), card));
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
			apply(card);
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
			apply(card);
			return preference;
		},
		claimSeenReport(toolCallId) {
			if (reportedSeen.has(toolCallId)) return false;
			reportedSeen.add(toolCallId);
			return true;
		},
	};

	return { get: (toolCallId) => cards.get(toolCallId), load, isLatest, host };
}

/**
 * True for a `save_user_preference` result that the card shows: a saved row or
 * a refused write. When preferences are off, the call shows as a tool step,
 * because the card endpoints refuse every edit.
 */
export function isPreferenceCardToolCall(toolCall: ToolCall): boolean {
	return (
		toolCall.tool === SAVE_USER_PREFERENCE_TOOL_NAME &&
		isContextPreferencesEnabled() &&
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
