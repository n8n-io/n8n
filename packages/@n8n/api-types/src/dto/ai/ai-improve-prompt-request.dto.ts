import { z } from 'zod';
import { Z } from 'zod-class';

export class AiImprovePromptRequestDto extends Z.class({
	prompt: z.string().min(1),
}) {}
