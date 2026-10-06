import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const logStreamingEventTypesFieldDocs = {
	data: {
		description: 'Event names that can be streamed to a destination.',
		example: ['n8n.workflow.started', 'n8n.workflow.success', 'n8n.workflow.failed'] as string[],
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
