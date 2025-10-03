import { z } from 'zod';
import { Z } from 'zod-class';

export class ChatMessageRequestDto extends Z.class({
	messageId: z.string().uuid(),
	message: z.string(),
	model: z.enum(['gpt-4', 'gpt-3.5-turbo']),
}) {}
