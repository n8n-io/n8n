import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InstanceAiAttachment,
	InstanceAiEnsureThreadResponse,
	InstanceAiSendMessageResponse,
	InstanceAiConfirmResponse,
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
	timeZone?: string,
	pushRef?: string,
): Promise<InstanceAiSendMessageResponse> {
	return await makeRestApiRequest<InstanceAiSendMessageResponse>(
		context,
		'POST',
		`/instance-ai/chat/${threadId}`,
		{
			message,
			...(researchMode ? { researchMode } : {}),
			...(attachments && attachments.length > 0 ? { attachments } : {}),
			...(timeZone ? { timeZone } : {}),
			...(pushRef ? { pushRef } : {}),
		},
	);
}

export async function ensureThread(
	context: IRestApiContext,
	threadId?: string,
): Promise<InstanceAiEnsureThreadResponse> {
	return await makeRestApiRequest<InstanceAiEnsureThreadResponse>(
		context,
		'POST',
		'/instance-ai/threads',
		{
			...(threadId ? { threadId } : {}),
		},
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
	setupWorkflowData?: {
		action?: 'apply' | 'test-trigger';
		nodeCredentials?: Record<string, Record<string, string>>;
		nodeParameters?: Record<string, Record<string, unknown>>;
		testTriggerNode?: string;
	},
	answers?: InstanceAiConfirmResponse['answers'],
	resourceDecision?: string,
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
		...(setupWorkflowData?.action ? { action: setupWorkflowData.action } : {}),
		...(setupWorkflowData?.nodeCredentials
			? { nodeCredentials: setupWorkflowData.nodeCredentials }
			: {}),
		...(setupWorkflowData?.nodeParameters
			? { nodeParameters: setupWorkflowData.nodeParameters }
			: {}),
		...(setupWorkflowData?.testTriggerNode
			? { testTriggerNode: setupWorkflowData.testTriggerNode }
			: {}),
		...(answers ? { answers } : {}),
		...(resourceDecision ? { resourceDecision } : {}),
	};
	await makeRestApiRequest(context, 'POST', `/instance-ai/confirm/${requestId}`, payload);
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
 * POST /instance-ai/gateway/disconnect-session -> { ok }
 * Tear down the current user's gateway session so its tools are no longer
 * exposed to the agent. Does not change the user's localGatewayDisabled
 * preference.
 */
export async function disconnectGatewaySession(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/instance-ai/gateway/disconnect-session');
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
