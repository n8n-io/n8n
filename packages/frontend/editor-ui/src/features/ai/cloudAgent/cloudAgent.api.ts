import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

/**
 * REST client for the cloud-agent module. Endpoints map directly to
 * packages/cli/src/modules/cloud-agent/cloud-agent.controller.ts.
 *
 * SSE is consumed via the URL returned by `eventsUrl()` and the EventSource
 * API (see useCloudAgentEventSource composable).
 */

export interface CloudAgentChatResponse {
	runId: string;
}

export interface CloudAgentCancelResponse {
	cancelled: boolean;
}

export interface CloudAgentToolResultPayload {
	toolCallId: string;
	output: unknown;
	isError: boolean;
}

export async function postChat(
	context: IRestApiContext,
	threadId: string,
	message: string,
): Promise<CloudAgentChatResponse> {
	return await makeRestApiRequest<CloudAgentChatResponse>(context, 'POST', '/cloud-agent/chat', {
		threadId,
		message,
	});
}

export async function postCancel(
	context: IRestApiContext,
	runId: string,
): Promise<CloudAgentCancelResponse> {
	return await makeRestApiRequest<CloudAgentCancelResponse>(
		context,
		'POST',
		`/cloud-agent/runs/${encodeURIComponent(runId)}/cancel`,
	);
}

export async function postToolResult(
	context: IRestApiContext,
	runId: string,
	payload: CloudAgentToolResultPayload,
): Promise<void> {
	await makeRestApiRequest(
		context,
		'POST',
		`/cloud-agent/runs/${encodeURIComponent(runId)}/tool-result`,
		payload,
	);
}

/**
 * SSE URL for a thread. EventSource adds the auth cookie automatically; the
 * server pipes the upstream cloud agent's stream byte-for-byte.
 */
export function eventsUrl(
	context: IRestApiContext,
	threadId: string,
	lastEventId?: number,
): string {
	const base = `${context.baseUrl}/cloud-agent/events/${encodeURIComponent(threadId)}`;
	return lastEventId !== undefined ? `${base}?lastEventId=${lastEventId}` : base;
}
