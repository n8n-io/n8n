import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class CreateAgentDto extends Z.class({
	name: z.string().min(1),
}) {}

export class UpdateAgentDto extends Z.class({
	name: z.string().optional(),
	code: z.string().optional(),
	updatedAt: z.string().optional(),
	description: z.string().optional(),
}) {}

export class AgentChatMessageDto extends Z.class({
	message: z.string().min(1),
}) {}

export class AgentIntegrationDto extends Z.class({
	type: z.string().min(1),
	credentialId: z.string().min(1),
}) {}
