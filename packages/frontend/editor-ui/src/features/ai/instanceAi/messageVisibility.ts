import type {
	InstanceAiAgentNode,
	InstanceAiMessage,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import {
	extractArtifactsFromToolCall,
	HIDDEN_TOOLS,
	isLegacyBuilderToolCall,
} from './agentTimeline.utils';
import { stripInternalInstanceAiBlocks } from './internalBlocks';

const HIDDEN_RENDER_HINTS = new Set(['data-table', 'eval-setup', 'planner', 'skill']);

function toolCallHasVisibleContent(
	toolCall: InstanceAiToolCallState,
	entry: Extract<InstanceAiTimelineEntry, { type: 'tool-call' }>,
	tree: InstanceAiAgentNode,
): boolean {
	if (HIDDEN_TOOLS.has(toolCall.toolName)) return false;

	if (toolCall.confirmation?.inputType === 'plan-review') return true;
	if (toolCall.confirmation?.inputType === 'questions') return !toolCall.isLoading;

	if (
		isLegacyBuilderToolCall(toolCall) ||
		(toolCall.renderHint && HIDDEN_RENDER_HINTS.has(toolCall.renderHint))
	) {
		return (
			tree.status !== 'active' &&
			entry.responseId !== undefined &&
			extractArtifactsFromToolCall(toolCall).length > 0
		);
	}

	return true;
}

function timelineEntryHasVisibleContent(
	entry: InstanceAiTimelineEntry,
	tree: InstanceAiAgentNode,
	toolCallsById: Map<string, InstanceAiToolCallState>,
	childrenById: Map<string, InstanceAiAgentNode>,
): boolean {
	if (entry.type === 'text') return entry.content.trim().length > 0;
	if (entry.type === 'child') return childrenById.has(entry.agentId);

	const toolCall = toolCallsById.get(entry.toolCallId);
	if (!toolCall) return false;

	return toolCallHasVisibleContent(toolCall, entry, tree);
}

/**
 * True when the message would produce visible output in the message list.
 */
export function messageHasVisibleContent(message: InstanceAiMessage): boolean {
	if (message.role === 'user') return true;
	if (stripInternalInstanceAiBlocks(message.content ?? '').length > 0) return true;

	const tree = message.agentTree;
	if (!tree) {
		return message.isStreaming;
	}

	if (tree.reasoning) return true;
	if (tree.statusMessage) return true;
	if (tree.status === 'error' && tree.error) return true;
	if (!message.isStreaming && tree.children.some((child) => child.status === 'active')) {
		return true;
	}

	const toolCallsById = new Map(tree.toolCalls.map((toolCall) => [toolCall.toolCallId, toolCall]));
	const childrenById = new Map(tree.children.map((child) => [child.agentId, child]));

	return tree.timeline.some((entry) =>
		timelineEntryHasVisibleContent(entry, tree, toolCallsById, childrenById),
	);
}
