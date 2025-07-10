import { z } from 'zod';
import { Z } from 'zod-class';

export class AiBuilderChatRequestDto extends Z.class({
	payload: z.object({
		question: z.string(),
	}),
}) {}
