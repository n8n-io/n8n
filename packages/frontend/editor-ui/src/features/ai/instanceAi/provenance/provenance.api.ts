import { z } from 'zod';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { InstanceAiWorkflowProvenance } from '@n8n/api-types';

const workflowProvenanceSchema: z.ZodType<InstanceAiWorkflowProvenance> = z.object({
	workflowId: z.string().min(1),
	threadId: z.string().min(1),
	createdAt: z.string(),
	canOpenThread: z.boolean(),
});

const workflowProvenanceResponseSchema = z.object({
	provenance: workflowProvenanceSchema.nullable(),
});

/**
 * Returns the Assistant chat that built the workflow, or null when the
 * Assistant did not build it. Rejects when the response has an unknown shape.
 */
export async function fetchWorkflowProvenance(
	context: IRestApiContext,
	workflowId: string,
): Promise<InstanceAiWorkflowProvenance | null> {
	const response: unknown = await makeRestApiRequest(
		context,
		'GET',
		`/instance-ai/provenance/${encodeURIComponent(workflowId)}`,
	);
	return workflowProvenanceResponseSchema.parse(response).provenance;
}
