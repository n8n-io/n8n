import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';

// ── Input schema ───────────────────────────────────────────────────────────────

const inputSchema = sanitizeInputSchema(
	z.object({
		templateId: z.string().describe('The numeric id of the workflow template to load'),
	}),
);

type Input = z.infer<typeof inputSchema>;

// ── Tool factory ───────────────────────────────────────────────────────────────

export function createTemplatesTool(context: InstanceAiContext) {
	return new Tool('templates')
		.description(
			'Load an n8n workflow template by its id. Returns the template workflow ' +
				'(nodes and connections) to use as a starting point for building.',
		)
		.input(inputSchema)
		.handler(async (input: Input) => {
			return await context.workflowTemplateService.getTemplate(input.templateId);
		})
		.build();
}
