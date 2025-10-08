import { z } from 'zod';
import { Z } from 'zod-class';

export const NodeCredentialsDetailsSchema = z.object({
	id: z.string(),
	name: z.string(),
});

export const SupportedNodeTypesSchema = z.enum(['@n8n/n8n-nodes-langchain.lmChatOpenAi']);

export class AskAiWithCredentialsRequestDto extends Z.class({
	messageId: z.string().uuid(),
	sessionId: z.string().uuid(),
	message: z.string(),
	provider: SupportedNodeTypesSchema,
	model: z.string(),
	credentials: z.record(NodeCredentialsDetailsSchema),
}) {}
