import type { AiAgentRequest, IDestinationNode, IRunData, ITaskData } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';

// The engine validates deeper states
const isObject = (val: unknown): boolean => typeof val === 'object' && val !== null;

const destinationNodeSchema = z.object({
	nodeName: z.string(),
	mode: z.enum(['inclusive', 'exclusive']),
}) satisfies z.ZodType<IDestinationNode>;

const triggerToStartFromSchema = z.object({
	name: z.string(),
	data: z.custom<ITaskData>(isObject).optional(),
});

const manualRunShape = {
	agentRequest: z.custom<AiAgentRequest>(isObject).optional(),
	chatSessionId: z.string().optional(),
	destinationNode: destinationNodeSchema.optional(),
	triggerToStartFrom: triggerToStartFromSchema.optional(),
	runData: z.custom<IRunData>(isObject).optional(),
	dirtyNodeNames: z.array(z.string()).optional(),
} as const;

const manualRunSchema = z
	.object(manualRunShape)
	.refine(
		(payload) => payload.triggerToStartFrom !== undefined || payload.destinationNode !== undefined,
		{
			message:
				'To run the workflow manually, specify either a trigger to start from or a destination node.',
		},
	);

export class ManualRunDto extends Z.class(manualRunShape) {
	static safeParse(data: unknown) {
		return manualRunSchema.safeParse(data);
	}

	static parse(data: unknown) {
		return manualRunSchema.parse(data);
	}
}
