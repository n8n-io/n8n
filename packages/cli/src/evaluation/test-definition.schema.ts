import { z } from 'zod';

export const testDefinitionCreateRequestBodySchema = z.object({
	name: z.string().min(1).max(255),
	workflowId: z.string().min(1),
	evaluationWorkflowId: z.string().min(1).optional(),
});

export const testDefinitionPatchRequestBodySchema = z.object({
	name: z.string().min(1).max(255).optional(),
	evaluationWorkflowId: z.string().min(1).optional(),
	annotationTagId: z.string().min(1).optional(),
});
