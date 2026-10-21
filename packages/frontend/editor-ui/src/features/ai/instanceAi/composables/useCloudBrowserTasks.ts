import { INSTANCE_AI_CLOUD_BROWSER_AGENT_ROLE, type InstanceAiAgentNode } from '@n8n/api-types';
import { computed, type ComputedRef } from 'vue';

import { useThread, type ThreadRuntime } from '../instanceAi.store';

/** Browser tools that can change the tab the agent works in, or the page in it. */
const LIVE_VIEW_TOOLS = new Set([
	'browser_start_session',
	'browser_navigate',
	'browser_back',
	'browser_forward',
	'browser_reload',
	'browser_tab_open',
	'browser_tab_focus',
	'browser_tab_close',
	'browser_request_user_action',
]);

export interface CloudBrowserUserAction {
	requestId: string;
	/** What the user must do, in the agent's words. */
	reason: string;
	/** The user took over without the agent asking. */
	userTookOver: boolean;
}

export interface CloudBrowserTask {
	agentId: string;
	taskId: string;
	title: string;
	/** Set while the task waits for the user to do a step in the browser. */
	userAction?: CloudBrowserUserAction;
	/**
	 * Changes each time a browser step finishes that can change the tab or page, so the live
	 * view link is fetched again.
	 */
	liveViewKey: string;
}

function collectBrowserAgents(node: InstanceAiAgentNode, out: InstanceAiAgentNode[]): void {
	if (node.role === INSTANCE_AI_CLOUD_BROWSER_AGENT_ROLE) out.push(node);
	for (const child of node.children) collectBrowserAgents(child, out);
}

function liveViewKeyOf(node: InstanceAiAgentNode): string {
	const finished = node.toolCalls.filter(
		(toolCall) => LIVE_VIEW_TOOLS.has(toolCall.toolName) && !toolCall.isLoading,
	);
	return `${finished.length}:${finished.at(-1)?.toolCallId ?? ''}`;
}

/** The thread's running cloud browser tasks, oldest first, from the agent tree. */
export function useCloudBrowserTasks(runtime?: ThreadRuntime): ComputedRef<CloudBrowserTask[]> {
	const thread = runtime ?? useThread();

	return computed(() => {
		const nodes: InstanceAiAgentNode[] = [];
		for (const message of thread.messages) {
			if (message.agentTree) collectBrowserAgents(message.agentTree, nodes);
		}

		const userActions = new Map<string, CloudBrowserUserAction>();
		for (const item of thread.pendingBrowserUserActions) {
			const { requestId, browserUserAction } = item.toolCall.confirmation;
			if (browserUserAction) {
				userActions.set(item.agentNode.agentId, {
					requestId,
					reason: browserUserAction.reason,
					userTookOver: browserUserAction.userTookOver === true,
				});
			}
		}

		return nodes
			.filter((node) => node.status === 'active' && node.taskId)
			.map((node) => ({
				agentId: node.agentId,
				taskId: node.taskId ?? '',
				title: node.title ?? node.subtitle ?? node.goal ?? '',
				userAction: userActions.get(node.agentId),
				liveViewKey: liveViewKeyOf(node),
			}));
	});
}
