import { z } from 'zod';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import {
	INSTANCE_AI_THREAD_SERVER_STATES,
	type InstanceAiShareThreadResponse,
	type InstanceAiThreadInfo,
} from '@n8n/api-types';

const sharedThreadSchema = z.object({
	id: z.string().min(1),
	title: z.string().optional(),
	resourceId: z.string(),
	projectId: z.string().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
	metadata: z.record(z.unknown()).optional(),
	// A state that this client does not know yet does not make the share fail.
	state: z.enum(INSTANCE_AI_THREAD_SERVER_STATES).optional().catch(undefined),
	needsInput: z.boolean().optional(),
	lastActivityAt: z.string().optional(),
	// A share always answers with a shared thread.
	sharedWith: z.object({ projectId: z.string().min(1), projectName: z.string() }),
	owner: z.object({ id: z.string().min(1), name: z.string() }),
}) satisfies z.ZodType<InstanceAiThreadInfo, z.ZodTypeDef, unknown>;

const shareThreadResponseSchema = z.object({
	thread: sharedThreadSchema,
}) satisfies z.ZodType<InstanceAiShareThreadResponse, z.ZodTypeDef, unknown>;

/**
 * Shares the owner's chat with its team project. Sharing a shared chat again changes
 * nothing. Returns the shared thread. Rejects when the response has an unknown shape.
 */
export async function shareThread(
	context: IRestApiContext,
	threadId: string,
): Promise<InstanceAiThreadInfo> {
	const response: unknown = await makeRestApiRequest(
		context,
		'POST',
		`/instance-ai/threads/${encodeURIComponent(threadId)}/share`,
	);
	return shareThreadResponseSchema.parse(response).thread;
}
