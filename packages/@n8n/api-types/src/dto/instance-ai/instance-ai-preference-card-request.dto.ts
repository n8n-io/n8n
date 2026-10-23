import { z } from 'zod';

import {
	aiPreferenceContentSchema,
	aiPreferenceScopeSchema,
} from '../../schemas/ai-preference.schema';
import { Z } from '../../zod-class';

/** The run and the tool call the card belongs to. The endpoint appends the
 *  `preference-card` fact to this run, so the card keeps its state after a reload. */
const cardTarget = {
	runId: z.string().min(1),
	toolCallId: z.string().min(1),
};

export class InstanceAiPreferenceCardUndoRequestDto extends Z.class(cardTarget) {}

/** The same target fields as `AiPreferenceRequestDto`: the service checks `projectId`
 *  and `userId` against `scope`, and an edit with scope `user` must name `userId`.
 *
 *  `scope` is absent when the edit changes only the text. The card remembers the scope
 *  its own last write named, which goes stale as soon as the row moves anywhere else,
 *  so a card that names no scope leaves the row where it is. */
export class InstanceAiPreferenceCardEditRequestDto extends Z.class({
	...cardTarget,
	content: aiPreferenceContentSchema,
	scope: aiPreferenceScopeSchema.optional(),
	projectId: z.string().max(36).nullish(),
	userId: z.string().uuid().nullish(),
}) {}
