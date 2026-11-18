import type { SelfHealingAgentResultDetail } from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

import type { InboxSelection } from '../inbox.constants';

export type AgentProposalSelection = Extract<InboxSelection, { type: 'self_healing_agent_result' }>;
export type AgentProposalAction = 'apply' | 'dismiss';

function proposalPath({ projectId, id }: AgentProposalSelection) {
	return `/projects/${encodeURIComponent(projectId)}/self-healing-agent-results/${encodeURIComponent(id)}`;
}

export async function fetchAgentProposal(
	context: IRestApiContext,
	selection: AgentProposalSelection,
): Promise<SelfHealingAgentResultDetail> {
	return await makeRestApiRequest(context, 'GET', proposalPath(selection));
}

export async function reviewAgentProposal(
	context: IRestApiContext,
	selection: AgentProposalSelection,
	action: AgentProposalAction,
): Promise<SelfHealingAgentResultDetail> {
	return await makeRestApiRequest(context, 'POST', `${proposalPath(selection)}/${action}`);
}
