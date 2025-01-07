import { z } from 'zod';

export const testDefinitionCreateRequestBodySchema = z
	.object({
		name: z.string().min(1).max(255),
		workflowId: z.string().min(1),
		description: z.string().optional(),
		evaluationWorkflowId: z.string().min(1).optional(),
		annotationTagId: z.string().min(1).optional(),
	})
	.strict();

export const testDefinitionPatchRequestBodySchema = z
	.object({
		name: z.string().min(1).max(255).optional(),
		description: z.string().optional(),
		evaluationWorkflowId: z.string().min(1).optional(),
		annotationTagId: z.string().min(1).optional(),
		mockedNodes: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
	})
	.strict();
