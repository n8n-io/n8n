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
	/**
	 * `running`: the browser is open. `done` and `failed`: the task ended, and its result has not
	 * reached the orchestrator yet. That waits until no run is live in the thread.
	 */
	state: 'running' | 'done' | 'failed';
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

function taskStateOf(node: InstanceAiAgentNode): CloudBrowserTask['state'] | undefined {
	if (node.status === 'active') return 'running';
	if (node.resultDelivered) return undefined;
	if (node.status === 'completed') return 'done';
	if (node.status === 'error') return 'failed';
	return undefined;
}

/**
 * The thread's cloud browser tasks that still matter to the user, oldest first, from the agent
 * tree: running ones, and finished ones whose result is still waiting to reach the orchestrator.
 * A task the user stopped is left out.
 */
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

		const tasks: CloudBrowserTask[] = [];
		for (const node of nodes) {
			if (!node.taskId) continue;
			const state = taskStateOf(node);
			if (!state) continue;
			tasks.push({
				agentId: node.agentId,
				taskId: node.taskId,
				title: node.title ?? node.subtitle ?? node.goal ?? '',
				state,
				userAction: userActions.get(node.agentId),
				liveViewKey: liveViewKeyOf(node),
			});
		}
		return tasks;
	});
}
