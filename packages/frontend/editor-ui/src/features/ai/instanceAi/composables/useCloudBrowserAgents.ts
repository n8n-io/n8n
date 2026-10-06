import type { InstanceAiAgentNode } from '@n8n/api-types';
import { computed, type ComputedRef } from 'vue';

import { useThread, type ThreadRuntime } from '../instanceAi.store';

/** PROTOTYPE: matches `ROLE` in `@n8n/instance-ai` `cloud-browser-agent.tool.ts`. */
const CLOUD_BROWSER_ROLE = 'cloud-browser';
const REQUEST_USER_ACTION = 'request-user-action';
/** PROTOTYPE: matches `BROWSER_STATE_EVENT` in `cloud-browser-agent.tool.ts`. */
const BROWSER_STATE_EVENT = 'cloud-browser-state';
/** PROTOTYPE: matches `NO_LOGIN_SITE` in `cloud-browser-agent.tool.ts`. */
const NO_LOGIN_SITE = '-';
/** PROTOTYPE: matches `NO_LIVE_VIEW` in `cloud-browser-agent.tool.ts`. */
const NO_LIVE_VIEW = '-';

export type CloudBrowserStatus =
	| 'running'
	| 'needs-user'
	| 'needs-approval'
	| 'completed'
	| 'failed'
	/** The site blocks the cloud browser, e.g. with a bot check. */
	| 'blocked'
	/** The user denied an approval or a step the goal needs. */
	| 'denied'
	| 'cancelled';

export interface CloudBrowserAgent {
	agentId: string;
	taskId?: string;
	/** The task's short name. */
	goal: string;
	/** What the sub-agent says it is doing now. */
	activity?: string;
	/** The page the browser is on. */
	pageUrl?: string;
	/** The browser window size, e.g. "1024x768". */
	viewport?: string;
	status: CloudBrowserStatus;
	/** Set while the sub-agent waits for the user, e.g. to sign in. */
	handOff?: { liveViewUrl: string; reason: string };
	/** The sub-agent's result or error, once it has finished. */
	summary?: string;
	/** Live View of the whole browser session, once it has started. */
	liveViewUrl?: string;
	/** The browser had a session and none is open now: it is switching sites, or closed. */
	betweenSessions?: boolean;
	/** A browser session is being created, e.g. right after the user approved a page. */
	starting?: boolean;
	/**
	 * PROTOTYPE (saved logins): the site "Remember this login" names at hand-back. Unset
	 * when the browser already uses a saved login.
	 */
	loginSite?: string;
}

/** Whether the task is still going, so its browser session is open. */
export function isLiveCloudBrowser(agent: CloudBrowserAgent): boolean {
	return (
		agent.status === 'running' || agent.status === 'needs-user' || agent.status === 'needs-approval'
	);
}

function findBrowserAgents(node: InstanceAiAgentNode, out: InstanceAiAgentNode[]): void {
	if (node.role === CLOUD_BROWSER_ROLE) out.push(node);
	for (const child of node.children) findBrowserAgents(child, out);
}

function pendingHandOff(node: InstanceAiAgentNode): CloudBrowserAgent['handOff'] {
	const call = [...node.toolCalls]
		.reverse()
		.find((toolCall) => toolCall.toolName === REQUEST_USER_ACTION && toolCall.isLoading);
	if (!call) return undefined;
	const { liveViewUrl, reason } = call.args;
	if (typeof liveViewUrl !== 'string') return undefined;
	return { liveViewUrl, reason: typeof reason === 'string' ? reason : '' };
}

/** Approvals the backend reports as answered, in the browser state events. */
function answeredApprovals(node: InstanceAiAgentNode): Set<string> {
	const answered = new Set<string>();
	for (const toolCall of node.toolCalls) {
		if (toolCall.toolName !== BROWSER_STATE_EVENT) continue;
		const requestId = toolCall.args.answeredApproval;
		if (typeof requestId === 'string') answered.add(requestId);
	}
	return answered;
}

/**
 * An approval card the sub-agent raised that is still waiting for the user. Its tool call
 * keeps loading until the tool has run, which for a navigation includes starting the
 * browser, so an answered card is told apart by the backend's report, or by this tab's
 * click before that report arrives.
 */
function hasPendingApproval(
	node: InstanceAiAgentNode,
	answeredHere: ReadonlyMap<string, unknown>,
): boolean {
	const answered = answeredApprovals(node);
	return node.toolCalls.some(
		(toolCall) =>
			toolCall.confirmation &&
			toolCall.isLoading &&
			!toolCall.confirmationStatus &&
			!answered.has(toolCall.confirmation.requestId) &&
			!answeredHere.has(toolCall.confirmation.requestId),
	);
}

/** The latest value of one field across the browser state events. Each event sends only changes. */
function latestState(node: InstanceAiAgentNode, field: string): string | undefined {
	for (let i = node.toolCalls.length - 1; i >= 0; i--) {
		const toolCall = node.toolCalls[i];
		if (toolCall.toolName !== BROWSER_STATE_EVENT) continue;
		const value = toolCall.args[field];
		if (typeof value === 'string') return value;
	}
	return undefined;
}

function liveViewOf(value: string | undefined): string | undefined {
	return value === NO_LIVE_VIEW ? undefined : value;
}

function loginSiteOf(value: string | undefined): string | undefined {
	return value === NO_LOGIN_SITE ? undefined : value;
}

function toBrowserAgent(
	node: InstanceAiAgentNode,
	answered: ReadonlyMap<string, unknown>,
): CloudBrowserAgent {
	const base = {
		agentId: node.agentId,
		taskId: node.taskId,
		goal: node.subtitle ?? node.goal ?? node.title ?? '',
		liveViewUrl: liveViewOf(latestState(node, 'liveViewUrl')),
		betweenSessions: latestState(node, 'liveViewUrl') === NO_LIVE_VIEW,
		starting: latestState(node, 'phase') === 'starting',
		pageUrl: latestState(node, 'pageUrl'),
		viewport: latestState(node, 'viewport'),
		activity: latestState(node, 'status'),
		loginSite: loginSiteOf(latestState(node, 'loginSite')),
	};
	if (node.status === 'active') {
		const handOff = pendingHandOff(node);
		if (handOff) return { ...base, status: 'needs-user', handOff };
		if (hasPendingApproval(node, answered)) return { ...base, status: 'needs-approval' };
		return { ...base, status: 'running' };
	}
	if (node.status === 'error') return { ...base, status: 'failed', summary: node.error };
	if (node.status === 'completed') {
		// "completed" only means the sub-agent stopped cleanly. The outcome says whether it did the job.
		const status = node.outcome === 'succeeded' || !node.outcome ? 'completed' : node.outcome;
		return { ...base, status, summary: node.result };
	}
	return { ...base, status: 'cancelled' };
}

/**
 * PROTOTYPE: the thread's cloud browser sub-agents for the sidebar. Running ones first,
 * then finished ones, newest first. Finished ones come back after a reload because the
 * spawn and completion events are persisted.
 */
export function useCloudBrowserAgents(runtime?: ThreadRuntime): ComputedRef<CloudBrowserAgent[]> {
	const thread = runtime ?? useThread();

	return computed(() => {
		const nodes: InstanceAiAgentNode[] = [];
		for (const message of thread.messages) {
			if (message.agentTree) findBrowserAgents(message.agentTree, nodes);
		}
		// A task the user stopped is gone: they know, and it has nothing to show.
		const agents = nodes
			.reverse()
			.map((node) => toBrowserAgent(node, thread.resolvedConfirmationIds))
			.filter((agent) => agent.status !== 'cancelled');
		return [
			...agents.filter(isLiveCloudBrowser),
			...agents.filter((agent) => !isLiveCloudBrowser(agent)),
		];
	});
}
