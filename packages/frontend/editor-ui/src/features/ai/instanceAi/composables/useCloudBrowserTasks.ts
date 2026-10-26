import type { InstanceAiAgentNode } from '@n8n/api-types';
import { computed, type ComputedRef, type InjectionKey } from 'vue';

import { isCloudBrowserAgent } from '../cloudBrowserAgents';
import { useThread, type ThreadRuntime } from '../instanceAi.store';

/** Opens a new browser session, which has a new live view link. */
const START_SESSION_TOOL = 'browser_start_session';

export interface CloudBrowserTask {
	agentId: string;
	taskId: string;
	title: string;
	/**
	 * `running`: the browser is open. `done` and `failed`: the task ended, and its result has not
	 * reached the orchestrator yet. That waits until no run is live in the thread.
	 */
	state: 'running' | 'done' | 'failed';
	/**
	 * Changes each time the agent opens a browser session or its current window changes, so the live
	 * view link is fetched again.
	 */
	sessionKey: string;
}

export const CloudBrowserTasksKey: InjectionKey<ComputedRef<CloudBrowserTask[]>> =
	Symbol('CloudBrowserTasks');

function sessionKeyOf(node: InstanceAiAgentNode): string {
	const started = node.toolCalls.filter(
		(toolCall) => toolCall.toolName === START_SESSION_TOOL && !toolCall.isLoading,
	);
	const sessionId = started.at(-1)?.toolCallId;
	if (!sessionId) return '';
	return `${sessionId}:${node.cloudBrowserWindowChanges ?? 0}`;
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
		// The task service spawns each browser agent as a child of its turn's orchestrator.
		const nodes: InstanceAiAgentNode[] = [];
		for (const message of thread.messages) {
			nodes.push(...(message.agentTree?.children.filter(isCloudBrowserAgent) ?? []));
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
				sessionKey: sessionKeyOf(node),
			});
		}
		return tasks;
	});
}
