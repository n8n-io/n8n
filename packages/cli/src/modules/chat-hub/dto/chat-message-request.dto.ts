import { z } from 'zod';
import { Z } from 'zod-class';

export class ChatMessageRequestDto extends Z.class({
	message: z.string(),
	model: z.string(),
}) {}
