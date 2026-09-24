import { z } from 'zod';

import { aiPreferenceContentSchema } from '../../schemas/ai-preference.schema';
import { Z } from '../../zod-class';

/** The run and the tool call the card belongs to. The endpoint appends the
 *  `preference-card` fact to this run, so the card keeps its state after a reload. */
const cardTarget = {
	runId: z.string().min(1),
	toolCallId: z.string().min(1),
};

export class InstanceAiPreferenceCardUndoRequestDto extends Z.class(cardTarget) {}

export class InstanceAiPreferenceCardEditRequestDto extends Z.class({
	...cardTarget,
	content: aiPreferenceContentSchema,
}) {}
