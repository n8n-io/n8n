import { z } from 'zod';
import { Z } from 'zod-class';

export class AiImprovePromptRequestDto extends Z.class({
	prompt: z.string().min(1),
	toolDescription: z.boolean().optional(),
	nodeContext: z
		.object({
			nodeName: z.string().optional(),
			parameters: z.array(z.record(z.unknown())).optional(),
			fromAIFields: z.array(z.string()).optional(),
		})
		.optional(),
}) {}
