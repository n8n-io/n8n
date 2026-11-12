import '../openapi-extend';

import { z } from 'zod';

import { Z } from '../zod-class';
import { AgentJsonConfigSchema, CUSTOM_TOOL_ID_REGEX } from './agent-json-config.schema';

export const agentCustomToolsSchema = z.record(
	z.string().min(1).regex(CUSTOM_TOOL_ID_REGEX),
	z
		.object({
			code: z.string(),
			descriptor: z
				.object({
					name: z.string().min(1).regex(CUSTOM_TOOL_ID_REGEX),
					description: z.string().default(''),
					systemInstruction: z.string().nullable().default(null),
					inputSchema: z.record(z.unknown()).nullable().default(null),
					outputSchema: z.record(z.unknown()).nullable().default(null),
					hasSuspend: z.boolean().default(false),
					hasResume: z.boolean().default(false),
					hasToMessage: z.boolean().default(false),
					requireApproval: z.boolean().default(false),
					outputTrust: z.literal('untrusted').nullish(),
					providerOptions: z.record(z.unknown()).nullable().default(null),
				})
				.strict(),
		})
		.strict(),
);

export class CreateAgentPublicDto extends Z.class(
	{
		name: z.string().trim().min(1).max(128),
		projectId: z.string().min(1).optional(),
		config: AgentJsonConfigSchema.openapi({
			type: 'object',
			description:
				'Agent configuration. Set name, model, and instructions. An empty model creates an unconfigured draft.',
			example: { name: 'Support', model: '', instructions: 'Help users.' },
		}).optional(),
		tools: agentCustomToolsSchema.optional(),
		availableInMCP: z.boolean().optional(),
	},
	{ strict: true },
) {}
