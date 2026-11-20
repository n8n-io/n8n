import type { AiPreferenceDto, AiPreferenceScope } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { inject, type InjectionKey } from 'vue';

import { editPreferenceCard, undoPreferenceCard } from './instanceAi.api';
import { useThread } from './instanceAi.store';
import { isPreferenceCardEvent } from './preferenceCard.utils';

/** The card that an edit or an undo comes from. */
export interface PreferenceCardTarget {
	preferenceId: string;
	toolCallId: string;
	/** The run of the card. Only the current Assistant runtime uses it. */
	runId: string;
}

export interface PreferenceCardEdit {
	content: string;
	/** Absent on a text-only edit, which leaves the row in the scope it holds now. */
	scope?: AiPreferenceScope;
	projectId?: string | null;
	userId?: string | null;
}

/**
 * The chat that shows a preference card: where the card stores what the user
 * did, and the project of its thread. The current Assistant chat and the
 * Assistant agent chat store the card state in different places.
 */
export interface PreferenceCardHost {
	/** The working project of the thread, for the scope labels and the scope options. */
	projectId(): string | undefined;
	/**
	 * Deletes the row and moves the card to `undone`. Returns `false` when the
	 * server answered without the card state, so the row state is unknown.
	 * Throws when the server refused.
	 */
	undo(target: PreferenceCardTarget): Promise<boolean>;
	/**
	 * Updates the row and moves the card to `edited`. Returns the saved row, or
	 * `null` when the server answered without the card state. Throws when the
	 * server refused.
	 */
	edit(target: PreferenceCardTarget, edit: PreferenceCardEdit): Promise<AiPreferenceDto | null>;
	/**
	 * Returns `true` the first time that the card of a call may report that the
	 * user saw it. Set by a chat that can mount the same card more than once.
	 * Without it, each card mount reports once.
	 */
	claimSeenReport?(toolCallId: string): boolean;
}

/** Set by a chat that is not the current Assistant chat. */
export const PREFERENCE_CARD_HOST: InjectionKey<PreferenceCardHost> = Symbol('preferenceCardHost');

/**
 * The current Assistant chat: the card endpoints append a `preference-card`
 * fact to the run, and the card applies the fact that they return. The stream
 * delivers the same fact later and sets the same fields.
 */
function useInstanceAiPreferenceCardHost(): PreferenceCardHost {
	const thread = useThread();
	const rootStore = useRootStore();

	function applyReturnedFact(response: unknown): boolean {
		const event =
			typeof response === 'object' && response !== null && 'event' in response
				? response.event
				: undefined;
		if (!isPreferenceCardEvent(event)) return false;
		thread.applyEvent(event);
		return true;
	}

	return {
		projectId: () => thread.projectId,
		async undo({ preferenceId, toolCallId, runId }) {
			const response = await undoPreferenceCard(rootStore.restApiContext, thread.id, preferenceId, {
				runId,
				toolCallId,
			});
			return applyReturnedFact(response);
		},
		async edit({ preferenceId, toolCallId, runId }, edit) {
			const response = await editPreferenceCard(rootStore.restApiContext, thread.id, preferenceId, {
				runId,
				toolCallId,
				...edit,
			});
			return applyReturnedFact(response) ? response.preference : null;
		},
	};
}

/** The host that a chat provides, or the current Assistant chat. */
export function usePreferenceCardHost(): PreferenceCardHost {
	return inject(PREFERENCE_CARD_HOST, null) ?? useInstanceAiPreferenceCardHost();
}
