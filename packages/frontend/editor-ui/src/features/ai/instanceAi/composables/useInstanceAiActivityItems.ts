import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useNow } from '@vueuse/core';
import { inject } from 'vue';
import type {
	AiActivityItem,
	AiActivityThinkingItem,
} from '../../shared/components/AiActivityTrace';
import { autoApprovalLabel, autoApprovalReason } from '../autoApproval';
import { useInstanceContextLabel } from '../instanceContextLabels';
import { useToolLabel } from '../toolLabels';
import { useActiveToolLabel } from './useRunActivity';
import { ThinkingWordKey } from './useThinkingWords';

type SegmentEntry = Extract<InstanceAiTimelineEntry, { type: 'text' | 'reasoning' }>;
type SkillUpdateEntry = Extract<InstanceAiTimelineEntry, { type: 'skill-update' }>;

export interface InstanceAiActivityBlock {
	entries: InstanceAiTimelineEntry[];
	active: boolean;
	awaitingInput?: boolean;
}

/** Duration of a block, from the timestamps of its tool calls. */
function blockDurationSec(
	entries: InstanceAiTimelineEntry[],
	toolCallsById: Map<string, InstanceAiToolCallState>,
): number | undefined {
	let start: number | undefined;
	let end: number | undefined;
	for (const entry of entries) {
		const toolCall = entry.type === 'tool-call' ? toolCallsById.get(entry.toolCallId) : undefined;
		if (!toolCall) continue;
		const startedAt = toolCall.startedAt ? Date.parse(toolCall.startedAt) : NaN;
		/**
		 * An interrupted call is stamped when the restarted process sweeps it, which can
		 * be hours after the work stopped, so its end time says nothing about the duration.
		 */
		const completedAt =
			toolCall.completedAt && !toolCall.interrupted ? Date.parse(toolCall.completedAt) : NaN;
		if (!Number.isNaN(startedAt))
			start = start === undefined ? startedAt : Math.min(start, startedAt);
		if (!Number.isNaN(completedAt))
			end = end === undefined ? completedAt : Math.max(end, completedAt);
	}
	if (start === undefined || end === undefined || end < start) return undefined;
	return Math.max(1, Math.round((end - start) / 1000));
}

/**
 * Maps the timeline entries of an Instance AI block to the rows of the shared
 * activity trace. Only the mapping is specific to Instance AI.
 */
export function useInstanceAiActivityItems(agentNode: () => InstanceAiAgentNode) {
	const i18n = useI18n();
	const { getToolLabel } = useToolLabel();
	const activeToolLabel = useActiveToolLabel();
	const { getInstanceContextLabel } = useInstanceContextLabel();
	/** A running source write rotates its label, so the label reads the clock. */
	const now = useNow({ interval: 1000 });
	/** The thread view provides a word only for the variant of the experiment. */
	const thinkingWord = inject(ThinkingWordKey, undefined);

	function skillUpdateLabel(entry: SkillUpdateEntry): string {
		return entry.name
			? i18n.baseText(`instanceAi.skillUpdate.${entry.change}`, {
					interpolate: { name: entry.name },
				})
			: i18n.baseText(`instanceAi.skillUpdate.${entry.change}.unnamed`);
	}

	function isToolCallLoading(toolCall: InstanceAiToolCallState): boolean {
		return agentNode().status === 'active' && toolCall.isLoading;
	}

	/** A running call gets the same label as the status bar; a finished one its own. */
	function toolCallLabel(toolCall: InstanceAiToolCallState): string {
		return isToolCallLoading(toolCall)
			? activeToolLabel(toolCall, agentNode(), now.value.getTime())
			: getToolLabel(toolCall.toolName, toolCall.args);
	}

	function activityRows(
		entries: InstanceAiTimelineEntry[],
		toolCallsById: Map<string, InstanceAiToolCallState>,
	): Array<AiActivityItem<InstanceAiToolCallState>> {
		const rows: Array<AiActivityItem<InstanceAiToolCallState>> = [];
		entries.forEach((entry, index) => {
			if (entry.type === 'instance-context') {
				rows.push({
					kind: 'step',
					id: `context-${index}`,
					label: getInstanceContextLabel(entry),
					testId: 'instance-ai-context-step',
				});
			} else if (entry.type === 'skill-update') {
				rows.push({
					kind: 'step',
					id: `skill-${index}`,
					label: skillUpdateLabel(entry),
					description: i18n.baseText(`instanceAi.skillUpdate.${entry.change}.description`),
					testId: 'instance-ai-skill-update',
				});
			} else if (entry.type === 'tool-call') {
				const toolCall = toolCallsById.get(entry.toolCallId);
				if (!toolCall) return;
				/** Auto mode ran this call without its approval card: say so, and why. */
				if (toolCall.autoApproval) {
					rows.push({
						kind: 'step',
						id: `approval-${toolCall.toolCallId}`,
						label: autoApprovalLabel(i18n, toolCall.autoApproval),
						description: autoApprovalReason(i18n, toolCall.autoApproval),
						testId: 'instance-ai-auto-approval',
					});
				}
				rows.push({
					kind: 'tool',
					id: toolCall.toolCallId,
					label: toolCallLabel(toolCall),
					toolName: toolCall.toolName,
					loading: isToolCallLoading(toolCall),
					error: toolCall.error,
					input: toolCall.args ?? undefined,
					output: toolCall.result,
					payload: toolCall,
				});
			}
		});
		return rows;
	}

	/** Rows of one block, in the same order as Agents: thinking, then the tool calls. */
	function activityItems(
		block: InstanceAiActivityBlock,
	): Array<AiActivityItem<InstanceAiToolCallState>> {
		const toolCallsById = new Map(
			agentNode().toolCalls.map((toolCall) => [toolCall.toolCallId, toolCall]),
		);
		const segments = block.entries.filter(
			(entry): entry is SegmentEntry => entry.type === 'text' || entry.type === 'reasoning',
		);
		const rows = activityRows(block.entries, toolCallsById);
		/** A running tool shows its own shimmer, so an empty thinking row would only repeat it. */
		const showThinking =
			segments.length > 0 ||
			(block.active && !rows.some((row) => row.kind === 'tool' && row.loading === true));
		const thinking: AiActivityThinkingItem[] = showThinking
			? [
					{
						kind: 'thinking',
						id: 'thinking',
						segments,
						active: block.active,
						awaitingInput: block.awaitingInput,
						durationSec: blockDurationSec(block.entries, toolCallsById),
						idleLabel: thinkingWord?.value,
						testId: 'instance-ai-thinking-block',
					},
				]
			: [];
		return [...thinking, ...rows];
	}

	return { activityItems };
}
