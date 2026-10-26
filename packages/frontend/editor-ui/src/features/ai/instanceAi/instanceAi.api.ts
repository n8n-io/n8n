import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	AiPreferenceScope,
	InstanceAiAttachment,
	InstanceAiBrowserCreateLinkResponse,
	InstanceAiBrowserStatusResponse,
	InstanceAiCloudBrowserLiveViewResponse,
	InstanceAiEnsureThreadResponse,
	InstanceAiSendMessageResponse,
	InstanceAiConfirmRequest,
	InstanceAiConfirmResponse,
	InstanceAiCredits,
	InstanceAiHandoffContext,
	InstanceAiThreadOrigin,
	InstanceAiThreadSource,
	InstanceAiThreadArtifactsContext,
	InstanceAiPreferenceCardEditResponse,
	InstanceAiPreferenceCardUndoResponse,
} from '@n8n/api-types';

export interface InstanceAiThreadLaunchInput {
	source: InstanceAiThreadSource;
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
	browserUseAvailable?: boolean,
	threadArtifacts?: InstanceAiThreadArtifactsContext,
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
			...(browserUseAvailable !== undefined ? { browserUseAvailable } : {}),
			...(threadArtifacts ? { threadArtifacts } : {}),
		},
	);
}

export async function ensureThread(
	context: IRestApiContext,
	threadId: string,
	projectId: string,
	launch: InstanceAiThreadLaunchInput,
): Promise<InstanceAiEnsureThreadResponse> {
	return await makeRestApiRequest<InstanceAiEnsureThreadResponse>(
		context,
		'POST',
		'/instance-ai/threads',
		{ threadId, projectId, ...launch },
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
 * GET /instance-ai/chat/:threadId/tasks/:taskId/cloud-browser-live-view
 * The live view of a cloud browser task. The link lets anyone who has it control the browser,
 * so keep it in memory only.
 */
export async function fetchCloudBrowserLiveView(
	context: IRestApiContext,
	threadId: string,
	taskId: string,
): Promise<InstanceAiCloudBrowserLiveViewResponse> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/instance-ai/chat/${threadId}/tasks/${taskId}/cloud-browser-live-view`,
	);
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
export async function getInstanceAiCredits(context: IRestApiContext): Promise<InstanceAiCredits> {
	return await makeRestApiRequest<InstanceAiCredits>(context, 'GET', '/instance-ai/credits');
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
 * POST /instance-ai/threads/:threadId/preferences/:preferenceId/undo -> { ok, event }
 * Deletes a preference the assistant saved in this run. The server appends a
 * `preference-card` fact to the run and returns it, so the card renders the
 * undone state without waiting for the stream to deliver the same fact.
 */
export async function undoPreferenceCard(
	context: IRestApiContext,
	threadId: string,
	preferenceId: string,
	body: { runId: string; toolCallId: string },
): Promise<InstanceAiPreferenceCardUndoResponse> {
	return await makeRestApiRequest<InstanceAiPreferenceCardUndoResponse>(
		context,
		'POST',
		`/instance-ai/threads/${threadId}/preferences/${preferenceId}/undo`,
		body,
	);
}

/**
 * POST /instance-ai/threads/:threadId/preferences/:preferenceId/edit -> { preference, event }
 * Rewrites a preference the assistant saved in this run. The server appends a
 * `preference-card` fact to the run and returns it, so the card renders the
 * edited state without waiting for the stream to deliver the same fact.
 */
export async function editPreferenceCard(
	context: IRestApiContext,
	threadId: string,
	preferenceId: string,
	body: {
		runId: string;
		toolCallId: string;
		content: string;
		/** Absent on a text-only edit, which leaves the row in the scope it holds now. */
		scope?: AiPreferenceScope;
		projectId?: string | null;
		userId?: string | null;
	},
): Promise<InstanceAiPreferenceCardEditResponse> {
	return await makeRestApiRequest<InstanceAiPreferenceCardEditResponse>(
		context,
		'POST',
		`/instance-ai/threads/${threadId}/preferences/${preferenceId}/edit`,
		body,
	);
}
