import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { InstanceAiContext } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const inputSchema = z
	.object({
		ids: z
			.array(z.string())
			.min(1)
			.describe('Learning IDs from the <team-learnings> catalog in the current conversation'),
	})
	.strict();

const outputSchema = z.object({
	learnings: z.array(
		z.object({
			id: z.string(),
			statement: z.string(),
			kind: z.enum(['preference', 'environment_fact', 'hypothesis']),
			appliesWhen: z.string(),
			confidence: z.number(),
			transferability: z.string(),
			evidence: z.object({
				supportingWorkflowIds: z.array(z.string()),
				supportingWorkflowCount: z.number(),
				counterexampleWorkflowIds: z.array(z.string()),
				counterexampleCount: z.number(),
				rejectedAlternatives: z.array(z.string()),
			}),
		}),
	),
});

export function createGetLearningTool(context: Pick<InstanceAiContext, 'learningService'>) {
	return new Tool(DOMAIN_TOOL_IDS.GET_LEARNING)
		.description(
			'Get the full text and evidence for project learnings listed in <team-learnings>. Load this tool before calling it. Use only learning IDs from that catalog.',
		)
		.input(inputSchema)
		.output(outputSchema)
		.handler(async (input: z.infer<typeof inputSchema>) => {
			if (!context.learningService) return { learnings: [] };
			const { ids } = input;
			return { learnings: await context.learningService.get([...new Set(ids)]) };
		})
		.build();
}
