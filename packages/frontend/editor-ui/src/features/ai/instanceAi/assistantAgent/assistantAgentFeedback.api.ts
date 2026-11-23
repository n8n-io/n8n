import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export type AssistantAgentRating = 'up' | 'down';

/** Rates the answer of a turn. The server sends the rating to the LangSmith trace of the turn. */
export async function postAssistantAgentFeedback(
	context: IRestApiContext,
	threadId: string,
	request: { executionId: string; rating: AssistantAgentRating },
): Promise<{ ok: true }> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/assistant/threads/${encodeURIComponent(threadId)}/feedback`,
		request,
	);
}
