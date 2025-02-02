import { z } from 'zod';
import { Z } from 'zod-class';

export class AiApplySuggestionRequestDto extends Z.class({
	sessionId: z.string(),
	suggestionId: z.string(),
}) {}
