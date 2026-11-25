import { z } from 'zod';

import { Z } from '../../zod-class';

/** Rates the answer of one Assistant agent turn. The execution of the turn identifies it. */
export class AssistantAgentFeedbackRequestDto extends Z.class({
	executionId: z.string().min(1).max(128),
	rating: z.enum(['up', 'down']),
}) {}
