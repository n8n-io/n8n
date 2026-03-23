import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InstanceAiAttachment,
	InstanceAiCanvasContext,
	InstanceAiEnsureThreadResponse,
	InstanceAiSendMessageResponse,
	InstanceAiConfirmResponse,
	InstanceAiThreadInfo,
	InstanceAiThreadListResponse,
} from '@n8n/api-types';

/**
 * POST /instance-ai/chat/:threadId -> { runId }
 * Sends a user message. Events arrive separately via the SSE connection.
 */
export async function postMessage(
	context: IRestApiContext,
	threadId: string,
	message: string,
	researchMode?: boolean,
	attachments?: InstanceAiAttachment[],
	canvasContext?: InstanceAiCanvasContext,
): Promise<InstanceAiSendMessageResponse> {
	return await makeRestApiRequest<InstanceAiSendMessageResponse>(
		context,
		'POST',
		`/instance-ai/chat/${threadId}`,
		{
			message,
			...(researchMode ? { researchMode } : {}),
			...(attachments && attachments.length > 0 ? { attachments } : {}),
			...(canvasContext ? { canvasContext } : {}),
		},
	);
}

export async function ensureThread(
	context: IRestApiContext,
	threadId?: string,
	workflowId?: string,
): Promise<InstanceAiEnsureThreadResponse> {
	return await makeRestApiRequest<InstanceAiEnsureThreadResponse>(
		context,
		'POST',
		'/instance-ai/threads',
		{
			...(threadId ? { threadId } : {}),
			...(workflowId ? { workflowId } : {}),
		},
	);
}

export async function findThreadByWorkflowId(
	context: IRestApiContext,
	workflowId: string,
): Promise<InstanceAiThreadInfo | null> {
	const response = await makeRestApiRequest<InstanceAiThreadListResponse>(
		context,
		'GET',
		`/instance-ai/threads?workflowId=${encodeURIComponent(workflowId)}`,
	);
	return response.threads.length > 0 ? response.threads[0] : null;
}

/**
 * POST /instance-ai/chat/:threadId/cancel -> 200 OK
 * Idempotent cancel of the active run on this thread.
 */
export async function postCancel(context: IRestApiContext, threadId: string): Promise<void> {
	await makeRestApiRequest(context, 'POST', `/instance-ai/chat/${threadId}/cancel`);
}

/**
 * POST /instance-ai/chat/:threadId/tasks/:taskId/cancel -> 200 OK
 * Cancel a specific background task.
 */
export async function postCancelTask(
	context: IRestApiContext,
	threadId: string,
	taskId: string,
): Promise<void> {
	await makeRestApiRequest(context, 'POST', `/instance-ai/chat/${threadId}/tasks/${taskId}/cancel`);
}

/**
 * POST /instance-ai/confirm/:requestId -> 200 OK
 * Approve or deny a confirmation request (HITL).
 */
export async function postConfirmation(
	context: IRestApiContext,
	requestId: string,
	approved: boolean,
	credentialId?: string,
	credentials?: Record<string, string>,
	autoSetup?: { credentialType: string },
	userInput?: string,
	domainAccessAction?: string,
): Promise<void> {
	const payload: InstanceAiConfirmResponse = {
		approved,
		...(credentialId ? { credentialId } : {}),
		...(credentials ? { credentials } : {}),
		...(autoSetup ? { autoSetup } : {}),
		...(userInput !== undefined ? { userInput } : {}),
		...(domainAccessAction
			? {
					domainAccessAction: domainAccessAction as InstanceAiConfirmResponse['domainAccessAction'],
				}
			: {}),
	};
	await makeRestApiRequest(context, 'POST', `/instance-ai/confirm/${requestId}`, payload);
}

/**
 * POST /instance-ai/gateway/create-link -> { token, command }
 * Generate a dynamic gateway token and pre-built CLI command.
 */
export async function createGatewayLink(
	context: IRestApiContext,
): Promise<{ token: string; command: string }> {
	return await makeRestApiRequest<{ token: string; command: string }>(
		context,
		'POST',
		'/instance-ai/gateway/create-link',
	);
}

/**
 * GET /instance-ai/gateway/status -> { connected, connectedAt, directory }
 * Check whether the gateway daemon is currently connected.
 */
export async function getGatewayStatus(
	context: IRestApiContext,
): Promise<{ connected: boolean; connectedAt: string | null; directory: string | null }> {
	return await makeRestApiRequest<{
		connected: boolean;
		connectedAt: string | null;
		directory: string | null;
	}>(context, 'GET', '/instance-ai/gateway/status');
}
