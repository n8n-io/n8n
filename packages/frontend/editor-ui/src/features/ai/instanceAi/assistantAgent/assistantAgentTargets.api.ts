import type {
	AssistantAgentTarget,
	AssistantAgentTargetsResponse,
	AssistantAgentTargetsState,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import type { AgentCreationResource } from '@/features/agents/types';

import type { PendingAgentRequest } from '../artifactAgentTargets';

export async function fetchAssistantAgentTargets(
	context: IRestApiContext,
	threadId: string,
): Promise<AssistantAgentTargetsResponse> {
	return await makeRestApiRequest(context, 'GET', `/assistant/threads/${threadId}/agent-targets`);
}

export async function bindAssistantAgentTarget(
	context: IRestApiContext,
	threadId: string,
	target: Required<AssistantAgentTarget>,
): Promise<AssistantAgentTargetsResponse> {
	return await makeRestApiRequest(
		context,
		'PUT',
		`/assistant/threads/${threadId}/agent-target`,
		target,
	);
}

/** Saves the pending agent of the thread under its minted id and binds it in the same request. */
export async function persistAssistantPendingAgent(
	context: IRestApiContext,
	threadId: string,
	request: PendingAgentRequest,
): Promise<{ agent: AgentCreationResource; targets: AssistantAgentTargetsState }> {
	return await makeRestApiRequest(context, 'POST', `/assistant/threads/${threadId}/agent`, request);
}
