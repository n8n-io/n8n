import type { LlmUsageCallItem } from '@n8n/api-types';
import { AGENT_BUILDER_VIEW, AGENT_SESSION_DETAIL_VIEW } from '@n8n/frontend-constants/agents';
import { VIEWS } from '@n8n/frontend-constants/views';
import type { RouteLocationRaw } from 'vue-router';

/** What made a call, as the calls table shows it, and where to open it. */
export interface CallSource {
	title: string;
	detail?: string;
	to?: RouteLocationRaw;
}

/** The translated texts that a source can show. */
export interface CallSourceTexts {
	untitledSession: string;
	notSet: string;
}

/**
 * The page of an agent, or of its session when the call has one. The parent agent route
 * renders nothing on its own, so the link names a child view.
 */
function agentRoute(
	projectId: string | null,
	agentId: string,
	threadId: string | null,
): RouteLocationRaw | undefined {
	if (!projectId) return undefined;
	if (threadId) {
		return { name: AGENT_SESSION_DETAIL_VIEW, params: { projectId, agentId, threadId } };
	}
	return { name: AGENT_BUILDER_VIEW, params: { projectId, agentId } };
}

/**
 * The source of a call: the agent, the n8n Assistant session, else the workflow. A deleted
 * source has no name and gets no link.
 */
export function callSource(
	call: LlmUsageCallItem,
	currentUserId: string | null,
	texts: CallSourceTexts,
): CallSource {
	const { agentId, agentName, threadId } = call;
	if (call.callerType === 'agent' && agentId && agentName) {
		return {
			title: agentName,
			detail: threadId
				? call.threadTitle || texts.untitledSession
				: (call.workflowName ?? undefined),
			to: agentRoute(call.projectId, agentId, threadId),
		};
	}
	if (call.callerType === 'instance-ai' && threadId) {
		return {
			title: call.threadTitle || texts.untitledSession,
			// Only its owner can open a session. No route-name constant exists for this view, so the
			// link uses the path. Redirects keep this path stable.
			to: call.userId === currentUserId ? { path: `/assistant/${threadId}` } : undefined,
		};
	}
	if (call.workflowId) {
		return {
			title: call.workflowName ?? texts.notSet,
			detail: call.nodeName ?? undefined,
			to: call.workflowName
				? { name: VIEWS.WORKFLOW, params: { workflowId: call.workflowId } }
				: undefined,
		};
	}
	return { title: texts.notSet };
}
