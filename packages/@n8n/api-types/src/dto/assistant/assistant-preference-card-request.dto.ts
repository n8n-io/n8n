import { z } from 'zod';

import {
	aiPreferenceContentSchema,
	aiPreferenceScopeSchema,
} from '../../schemas/ai-preference.schema';
import { Z } from '../../zod-class';

/** The `save_user_preference` call that the card shows. The endpoint stores the card state under it. */
const cardTarget = {
	toolCallId: z.string().min(1).max(255),
};

export class AssistantPreferenceCardUndoRequestDto extends Z.class(cardTarget) {}

/**
 * The same fields as `InstanceAiPreferenceCardEditRequestDto`, without the run.
 * `scope` is absent when the edit changes only the text, so the row stays where it is.
 */
export class AssistantPreferenceCardEditRequestDto extends Z.class({
	...cardTarget,
	content: aiPreferenceContentSchema,
	scope: aiPreferenceScopeSchema.optional(),
	projectId: z.string().max(36).nullish(),
	userId: z.string().uuid().nullish(),
}) {}
