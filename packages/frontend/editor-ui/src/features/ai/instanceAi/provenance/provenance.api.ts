import { z } from 'zod';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InstanceAiProvenanceListItem,
	InstanceAiProvenanceListResponse,
	InstanceAiWorkflowProvenance,
} from '@n8n/api-types';

const workflowProvenanceSchema = z.object({
	workflowId: z.string().min(1),
	threadId: z.string().min(1),
	createdAt: z.string(),
	canOpenThread: z.boolean(),
}) satisfies z.ZodType<InstanceAiWorkflowProvenance>;

const automationListResponseSchema = z.object({
	items: z.array(
		workflowProvenanceSchema.extend({
			name: z.string(),
			active: z.boolean(),
		}) satisfies z.ZodType<InstanceAiProvenanceListItem>,
	),
}) satisfies z.ZodType<InstanceAiProvenanceListResponse>;

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

/**
 * Returns the workflows that the Assistant built for the current user and that the user
 * can read, newest first. Rejects when the response has an unknown shape.
 */
export async function fetchMyAutomations(
	context: IRestApiContext,
	limit: number,
): Promise<InstanceAiProvenanceListItem[]> {
	const response: unknown = await makeRestApiRequest(context, 'GET', '/instance-ai/provenance', {
		limit,
	});
	return automationListResponseSchema.parse(response).items;
}
