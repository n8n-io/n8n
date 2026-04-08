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

export class UpdateAgentSchemaDto extends Z.class({
	schema: z.object({
		model: z.object({
			provider: z.string().nullable(),
			name: z.string().nullable(),
			raw: z.string().optional(),
		}),
		credential: z.string().nullable(),
		instructions: z.string().nullable(),
		description: z.string().nullable(),
		tools: z.array(z.record(z.unknown())),
		providerTools: z.array(z.record(z.unknown())),
		memory: z.record(z.unknown()).nullable(),
		evaluations: z.array(z.record(z.unknown())),
		guardrails: z.array(z.record(z.unknown())),
		mcp: z.array(z.record(z.unknown())).nullable(),
		telemetry: z.record(z.unknown()).nullable(),
		checkpoint: z.enum(['memory']).nullable(),
		config: z.record(z.unknown()),
	}),
	updatedAt: z.string(),
}) {}
