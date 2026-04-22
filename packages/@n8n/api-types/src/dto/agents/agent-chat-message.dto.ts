import { z } from 'zod';

import { Z } from '../../zod-class';

export class AgentChatMessageDto extends Z.class({
	message: z.string().min(1),
	sessionId: z.string().min(1).optional(),
}) {}
