import { z } from 'zod';

import type { AiPreferenceDto } from './ai-preference.schema';
import { preferenceCardPayloadSchema } from './instance-ai.schema';

/** Most preference cards that the metadata of one Assistant agent thread holds. */
export const MAX_ASSISTANT_PREFERENCE_CARDS = 100;

/**
 * What the user did on the preference card of one `save_user_preference` call
 * in an Assistant agent thread: an edit or an undo. The card endpoints store it
 * in the thread metadata, so the card shows the same state after a reload. It
 * has the shape of the `preference-card` fact of the current Assistant runtime.
 */
export const assistantPreferenceCardSchema = preferenceCardPayloadSchema.extend({
	toolCallId: z.string().min(1).max(255),
});
export type AssistantPreferenceCard = z.infer<typeof assistantPreferenceCardSchema>;

/** The stored cards of a thread, by tool call id. */
export const assistantPreferenceCardsStateSchema = z.record(
	z.string(),
	assistantPreferenceCardSchema,
);
export type AssistantPreferenceCardsState = z.infer<typeof assistantPreferenceCardsStateSchema>;

export interface AssistantPreferenceCardsResponse {
	/** Only the cards that the user changed. Other cards show the tool result. */
	cards: AssistantPreferenceCardsState;
}

export interface AssistantPreferenceCardUndoResponse {
	card: AssistantPreferenceCard;
}

export interface AssistantPreferenceCardEditResponse {
	preference: AiPreferenceDto;
	card: AssistantPreferenceCard;
}
