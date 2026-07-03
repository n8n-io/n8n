import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InstanceAiAttachment,
	InstanceAiBrowserCreateLinkResponse,
	InstanceAiBrowserStatusResponse,
	InstanceAiEnsureThreadResponse,
	InstanceAiSendMessageResponse,
	InstanceAiConfirmRequest,
	InstanceAiConfirmResponse,
	InstanceAiHandoffContext,
	InstanceAiThreadOrigin,
	InstanceAiThreadSource,
} from '@n8n/api-types';

export interface InstanceAiThreadLaunchInput {
	source?: InstanceAiThreadSource;
	origin?: InstanceAiThreadOrigin;
	sourceContext?: Record<string, unknown>;
}

/**
 * POST /instance-ai/chat/:threadId -> { runId }
 * Sends a user message. Events arrive separately via the SSE connection.
 */
export async function postMessage(
	context: IRestApiContext,
	threadId: string,
	message: string,
	attachments?: InstanceAiAttachment[],
	handoffContext?: InstanceAiHandoffContext,
	timeZone?: string,
	pushRef?: string,
): Promise<InstanceAiSendMessageResponse> {
	return await makeRestApiRequest<InstanceAiSendMessageResponse>(
		context,
		'POST',
		`/instance-ai/chat/${threadId}`,
		{
			message,
			...(attachments && attachments.length > 0 ? { attachments } : {}),
			...(handoffContext ? { context: handoffContext } : {}),
			...(timeZone ? { timeZone } : {}),
			...(pushRef ? { pushRef } : {}),
		},
	);
}

export async function ensureThread(
	context: IRestApiContext,
	threadId: string,
	projectId: string,
	launch?: InstanceAiThreadLaunchInput,
): Promise<InstanceAiEnsureThreadResponse> {
	return await makeRestApiRequest<InstanceAiEnsureThreadResponse>(
		context,
		'POST',
		'/instance-ai/threads',
		{ threadId, projectId, ...(launch ?? {}) },
	);
}

/**
 * POST /instance-ai/chat/:threadId/cancel -> 200 OK
 * Idempotent cancel of the active run on this thread.
 */
export async function postCancel(context: IRestApiContext, threadId: string): Promise<void> {
	await makeRestApiRequest(context, 'POST', `/instance-ai/chat/${threadId}/cancel`);
}

/**
 * POST /instance-ai/feedback/:threadId/:responseId -> { ok: true }
 * Annotate the LangSmith trace for this response with a thumbs-up/down rating
 * and optional text comment. Idempotent: re-submitting upserts the record.
 */
export async function postFeedback(
	context: IRestApiContext,
	threadId: string,
	responseId: string,
	payload: { rating: 'up' | 'down'; comment?: string },
): Promise<void> {
	await makeRestApiRequest(
		context,
		'POST',
		`/instance-ai/feedback/${threadId}/${responseId}`,
		payload,
	);
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
 * Resolve a confirmation request (HITL). The request body is a discriminated
 * union on `kind`.
 */
export async function postConfirmation(
	context: IRestApiContext,
	requestId: string,
	payload: InstanceAiConfirmRequest,
): Promise<InstanceAiConfirmResponse> {
	return await makeRestApiRequest<InstanceAiConfirmResponse>(
		context,
		'POST',
		`/instance-ai/confirm/${requestId}`,
		payload,
	);
}

/**
 * GET /instance-ai/credits -> { creditsQuota, creditsClaimed }
 * Returns -1 quota when proxy is disabled.
 */
export async function getInstanceAiCredits(
	context: IRestApiContext,
): Promise<{ creditsQuota: number; creditsClaimed: number }> {
	return await makeRestApiRequest<{ creditsQuota: number; creditsClaimed: number }>(
		context,
		'GET',
		'/instance-ai/credits',
	);
}

/**
 * POST /instance-ai/gateway/create-link -> { token, command, expiresAt, ttlSeconds }
 * Generate a dynamic gateway token and pre-built CLI command.
 */
export async function createGatewayLink(context: IRestApiContext): Promise<{
	token: string;
	command: string;
	expiresAt: string | null;
	ttlSeconds: number | null;
}> {
	return await makeRestApiRequest<{
		token: string;
		command: string;
		expiresAt: string | null;
		ttlSeconds: number | null;
	}>(context, 'POST', '/instance-ai/gateway/create-link');
}

/**
 * POST /instance-ai/gateway/disconnect-session -> { ok }
 * Tear down the current user's gateway session so its tools are no longer
 * exposed to the agent. Does not change the user's localGatewayDisabled
 * preference.
 */
export async function disconnectGatewaySession(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/instance-ai/gateway/disconnect-session');
}

/**
 * POST /instance-ai/browser/create-link -> { connectUrl, expiresAt, ttlSeconds }
 * Create (or refresh) a direct browser session and return the opaque URL that
 * opens the Browser Use extension connect page.
 */
export async function createBrowserLink(
	context: IRestApiContext,
): Promise<InstanceAiBrowserCreateLinkResponse> {
	return await makeRestApiRequest<InstanceAiBrowserCreateLinkResponse>(
		context,
		'POST',
		'/instance-ai/browser/create-link',
	);
}

/**
 * GET /instance-ai/browser/status -> { connected, connectedAt, toolCategories }
 * Check whether the Browser Use extension is connected directly to the server.
 */
export async function getBrowserStatus(
	context: IRestApiContext,
): Promise<InstanceAiBrowserStatusResponse> {
	return await makeRestApiRequest<InstanceAiBrowserStatusResponse>(
		context,
		'GET',
		'/instance-ai/browser/status',
	);
}

/**
 * POST /instance-ai/browser/disconnect-session -> { ok }
 * Tear down the current user's direct browser session.
 */
export async function disconnectBrowserSession(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/instance-ai/browser/disconnect-session');
}

/**
 * GET /instance-ai/gateway/status -> { connected, connectedAt, directory, hostIdentifier, toolCategories }
 * Check whether the gateway daemon is currently connected.
 */
export async function getGatewayStatus(context: IRestApiContext): Promise<{
	connected: boolean;
	connectedAt: string | null;
	directory: string | null;
	hostIdentifier: string | null;
	toolCategories: Array<{ name: string; enabled: boolean; writeAccess?: boolean }>;
}> {
	return await makeRestApiRequest<{
		connected: boolean;
		connectedAt: string | null;
		directory: string | null;
		hostIdentifier: string | null;
		toolCategories: Array<{ name: string; enabled: boolean; writeAccess?: boolean }>;
	}>(context, 'GET', '/instance-ai/gateway/status');
}
