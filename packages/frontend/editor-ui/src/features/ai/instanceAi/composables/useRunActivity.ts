import {
	SHARED_BUILDER_TOOL_NAMES,
	WORKFLOW_BUILDER_TOOL_NAMES,
	resolveBuilderToolName,
	type InstanceAiAgentNode,
	type InstanceAiConfirmation,
	type InstanceAiMessage,
	type InstanceAiToolCallState,
} from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';
import { useNow } from '@vueuse/core';

import { useSteadyValue } from './useSteadyValue';
import { getAgentActivityKey, getAgentSectionTitle, isActiveBuilderAgent } from '../builderAgents';
import { useToolLabel } from '../toolLabels';

export interface RunActivity {
	label: string;
	detail?: string;
	/** The run waits on the user: a question, an approval or credentials. */
	waiting?: true;
}

/** The activity as one line, the way the status bar shows it. */
export function formatRunActivity(activity: RunActivity): string {
	return activity.detail ? `${activity.label} · ${activity.detail}` : activity.label;
}

// A validation error names its node after its code: `[SET_INVALID_ASSIGNMENT] (Set): ...`.
const ERROR_NODE_PATTERN = /^\[[A-Z0-9_]+\]\s*\(([^)]+)\)/;
/** A streamed node counts as configured once it has been the newest for this long. */
const CONFIGURING_AFTER_MS = 2000;
/** How long each node shows while the agent fixes several. */
const FIX_ROTATION_MS = 3000;

function unique(names: string[]): string[] {
	return [...new Set(names)];
}

function nodesOfBuildErrors(result: Record<string, unknown>): string[] {
	if (!Array.isArray(result.errors)) return [];
	return unique(
		result.errors.flatMap((error: unknown) => {
			const match = typeof error === 'string' ? ERROR_NODE_PATTERN.exec(error) : null;
			return match ? [match[1]] : [];
		}),
	);
}

function nodesOfTestErrors(result: unknown): string[] {
	if (!isRecord(result) || !Array.isArray(result.nodeErrors)) return [];
	return unique(
		result.nodeErrors.flatMap((error: unknown) =>
			isRecord(error) && typeof error.nodeName === 'string' ? [error.nodeName] : [],
		),
	);
}

/** What comes after a finished call, so the status does not fall back to "Thinking". */
const NEXT_STEP_KEYS: Readonly<Record<string, BaseTextKey>> = {
	[SHARED_BUILDER_TOOL_NAMES.SEARCH_NODES]: 'instanceAi.activity.choosingNodes',
	[SHARED_BUILDER_TOOL_NAMES.GET_NODE_TYPES]: 'instanceAi.activity.planning',
	load_skill: 'instanceAi.activity.planning',
	workspace_write_file: 'instanceAi.activity.reviewing',
	workspace_str_replace_file: 'instanceAi.activity.reviewing',
};

function isWaitingOnUser(
	toolCall: InstanceAiToolCallState,
): toolCall is InstanceAiToolCallState & { confirmation: InstanceAiConfirmation } {
	return (
		toolCall.confirmation !== undefined &&
		toolCall.isLoading &&
		toolCall.confirmationStatus !== 'approved' &&
		toolCall.confirmationStatus !== 'denied' &&
		!toolCall.confirmation.expired
	);
}

function findWaitingConfirmation(node: InstanceAiAgentNode): InstanceAiConfirmation | undefined {
	const own = node.toolCalls.find(isWaitingOnUser)?.confirmation;
	if (own) return own;
	for (const child of node.children) {
		const found = findWaitingConfirmation(child);
		if (found) return found;
	}
	return undefined;
}

function waitingLabelKey(confirmation: InstanceAiConfirmation): BaseTextKey {
	if (confirmation.credentialRequests?.length || confirmation.credentialFlow) {
		return 'instanceAi.activity.waiting.credentials';
	}
	switch (confirmation.inputType) {
		case 'questions':
		case 'text':
			return 'instanceAi.activity.waiting.answer';
		case 'resource-decision':
			return 'instanceAi.activity.waiting.choice';
		case 'continue':
			return 'instanceAi.activity.waiting.continue';
		default:
			return 'instanceAi.activity.waiting.approval';
	}
}

/**
 * What the agent does now: the active sub-agent, the running tool, or the step
 * that follows the last finished tool. The chat status bar and the draft canvas
 * both show it, so they always read the same.
 */
export function useRunActivity() {
	const i18n = useI18n();
	const { getToolLabel } = useToolLabel();

	// When each streamed node first became the newest, by tool call.
	const newestNodeSince = new Map<string, number>();

	function runningToolLabel(toolCall: InstanceAiToolCallState, now: number): string {
		const newestNode = toolCall.inputProgress?.nodeNames.at(-1);
		let configuring = false;
		if (newestNode) {
			const key = `${toolCall.toolCallId}\u0000${newestNode}`;
			const since = newestNodeSince.get(key) ?? now;
			newestNodeSince.set(key, since);
			configuring = now - since >= CONFIGURING_AFTER_MS;
		}
		return getToolLabel(toolCall.toolName, toolCall.args, toolCall.inputProgress, { configuring });
	}

	/** One of the nodes being fixed, a different one every few seconds. */
	function fixingLabel(nodeNames: string[], now: number): string | undefined {
		if (nodeNames.length === 0) return undefined;
		const name = nodeNames[Math.floor(now / FIX_ROTATION_MS) % nodeNames.length];
		return i18n.baseText('instanceAi.activity.fixingNode', { interpolate: { name } });
	}

	function buildNextStep(result: unknown, now: number): string {
		if (!isRecord(result) || result.success !== false) {
			return i18n.baseText('instanceAi.activity.reviewing');
		}
		return (
			fixingLabel(nodesOfBuildErrors(result), now) ??
			i18n.baseText('instanceAi.activity.fixingWorkflow')
		);
	}

	function verifyNextStep(result: unknown, now: number): string {
		return (
			fixingLabel(nodesOfTestErrors(result), now) ??
			i18n.baseText('instanceAi.activity.reviewingTest')
		);
	}

	/** The step after the last finished call of an agent, when it is known. */
	function nextStepLabel(node: InstanceAiAgentNode, now: number): string | undefined {
		const last = node.toolCalls.at(-1);
		if (!last) return undefined;
		const toolName = resolveBuilderToolName(last.toolName, last.args.action);
		if (toolName === WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW) {
			return buildNextStep(last.result, now);
		}
		if (toolName === WORKFLOW_BUILDER_TOOL_NAMES.VERIFY_BUILT_WORKFLOW) {
			return verifyNextStep(last.result, now);
		}
		const key = Object.hasOwn(NEXT_STEP_KEYS, toolName) ? NEXT_STEP_KEYS[toolName] : undefined;
		return key ? i18n.baseText(key) : undefined;
	}

	return (messages: InstanceAiMessage[], now = Date.now()): RunActivity | null => {
		// Match the still-streaming orchestrator message, or — once it has handed off
		// to a background builder — the message that owns the active builder, so the
		// label keeps tracking work after `isStreaming` flips false.
		const lastMsg = [...messages]
			.reverse()
			.find(
				(m) =>
					m.role === 'assistant' &&
					(m.isStreaming || (m.agentTree?.children.some(isActiveBuilderAgent) ?? false)),
			);
		if (!lastMsg?.agentTree) return { label: i18n.baseText('instanceAi.statusBar.thinking') };

		const tree = lastMsg.agentTree;

		const waitingOn = findWaitingConfirmation(tree);
		if (waitingOn) return { label: i18n.baseText(waitingLabelKey(waitingOn)), waiting: true };

		// Check active children first (sub-agents)
		const activeChild = tree.children.find((c: InstanceAiAgentNode) => c.status === 'active');
		if (activeChild) {
			const activityKey = getAgentActivityKey(activeChild);
			const roleLabel =
				getAgentSectionTitle(activeChild, activityKey ? i18n.baseText(activityKey) : undefined) ??
				i18n.baseText('instanceAi.statusBar.thinking');
			const activeTool = activeChild.toolCalls.find((tc: InstanceAiToolCallState) => tc.isLoading);
			const detail = activeTool
				? runningToolLabel(activeTool, now)
				: nextStepLabel(activeChild, now);
			return detail ? { label: roleLabel, detail } : { label: roleLabel };
		}

		// Check root-level active tools
		const activeTool = tree.toolCalls.find((tc: InstanceAiToolCallState) => tc.isLoading);
		if (activeTool) return { label: runningToolLabel(activeTool, now) };

		return { label: nextStepLabel(tree, now) ?? i18n.baseText('instanceAi.statusBar.thinking') };
	};
}

/**
 * The run activity, held steady so that short steps do not flash. The chat
 * status bar and the draft canvas both use it, so they change together.
 */
export function useSteadyRunActivity(messages: () => InstanceAiMessage[]) {
	const deriveActivity = useRunActivity();
	// Some states move on with time (configuring a node, rotating fixes), not only with events.
	const now = useNow({ interval: 1000 });
	return useSteadyValue(() => deriveActivity(messages(), now.value.getTime()) ?? undefined, {
		key: (activity) => `${activity.waiting ? 'waiting:' : ''}${formatRunActivity(activity)}`,
		urgent: (activity) => activity.waiting === true,
	});
}
