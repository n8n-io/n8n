import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const llmUsageCallsQueryFieldDocs = {
	startDate: {
		description: 'ISO 8601 start of the range, inclusive. Defaults to 30 days before endDate.',
	},
	endDate: {
		description:
			'ISO 8601 end of the range, exclusive. Defaults to now. Set it to page through a fixed range.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const llmUsageCallFieldDocs = {
	callId: { description: 'Unique identifier of the call.' },
	startedAt: { description: 'When the call started. Null when it is not known.' },
	finishedAt: { description: 'When the call finished.' },
	durationMs: { description: 'Duration of the call in milliseconds. Null when not known.' },
	callerType: {
		description: 'What made the call.',
		example: 'node',
	},
	workflowId: { description: 'Workflow that made the call.' },
	executionId: { description: 'Execution that made the call.' },
	executionMode: {
		description: 'Mode of the run that started the work.',
		example: 'trigger',
	},
	nodeName: { description: 'Name of the node that made the call.' },
	nodeType: { description: 'Type of the node that made the call.' },
	agentId: { description: 'Agent that made the call.' },
	threadId: { description: 'Agent or n8n Assistant session of the call.' },
	projectId: { description: 'Project that the call belongs to.' },
	userId: { description: 'User who started the work.' },
	credentialId: { description: 'Credential that paid for the call.' },
	managedBy: {
		description:
			'Set when n8n credits paid for the call instead of a credential: aiGateway for Gateway credits, assistant for Assistant credits.',
	},
	provider: { description: 'LLM provider.', example: 'openai' },
	model: { description: 'Model that answered the call.', example: 'gpt-5-mini' },
	inputTokens: { description: 'All input tokens, cached tokens included.' },
	outputTokens: { description: 'All output tokens, reasoning tokens included.' },
	cacheReadTokens: { description: 'Input tokens read from the provider cache.' },
	cacheWriteTokens: { description: 'Input tokens written to the provider cache.' },
	estimatedCostUsd: {
		description:
			'Estimated cost in US dollars, from public list prices. Null when the model has no price.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
