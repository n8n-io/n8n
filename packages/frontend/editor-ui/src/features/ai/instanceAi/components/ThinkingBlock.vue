<script lang="ts" setup>
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { N8nAiActivityStep } from '@n8n/design-system';
import { computed } from 'vue';
import AiReasoningBlock from '../../shared/components/AiReasoningBlock.vue';
import AiThinkingBlock from '../../shared/components/AiThinkingBlock.vue';

import { isStreamingTimelineEntry } from '../agentTimeline.utils';
import { useInstanceContextLabel } from '../instanceContextLabels';
import { useToolLabel } from '../toolLabels';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import InstanceContextStep from './InstanceContextStep.vue';
import ToolResultJson from './ToolResultJson.vue';
import ToolResultRenderer from './ToolResultRenderer.vue';

const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		entries: InstanceAiTimelineEntry[];
		active: boolean;
		awaitingInput?: boolean;
	}>(),
	{ awaitingInput: false },
);

const { getToolLabel } = useToolLabel();
const { getInstanceContextLabel } = useInstanceContextLabel();

const toolCallsById = computed(() => {
	const map: Record<string, InstanceAiToolCallState> = {};
	for (const toolCall of props.agentNode.toolCalls) {
		map[toolCall.toolCallId] = toolCall;
	}
	return map;
});

function toolCallFor(entry: InstanceAiTimelineEntry): InstanceAiToolCallState | undefined {
	return entry.type === 'tool-call' ? toolCallsById.value[entry.toolCallId] : undefined;
}

const tailToolCall = computed<InstanceAiToolCallState | undefined>(() => {
	if (!props.active || props.awaitingInput) return undefined;
	const last = props.entries[props.entries.length - 1];
	if (!last || last.type !== 'tool-call') return undefined;
	return toolCallsById.value[last.toolCallId];
});

/**
 * The collapsed subline's label. Without one it falls back to `ai.thinking.active`,
 * which is the same "Thinking" string the header already shows — so the row reads as a
 * duplicate of the header rather than as the current activity.
 *
 * The context row is the tail for the whole first leg of a turn, before any tool runs, so
 * it has to carry the subline the way a running tool call does. It carries the row's own
 * label rather than a wording of its own: the states worth telling apart are "told
 * nothing", "the read failed" and "told this much", and a second wording would have to
 * pick one of them — so a turn handed nothing would read as a read in flight.
 */
const activityLabel = computed<string | undefined>(() => {
	const toolCall = tailToolCall.value;
	if (toolCall) return getToolLabel(toolCall.toolName, toolCall.args);

	if (!props.active || props.awaitingInput) return undefined;
	const last = props.entries[props.entries.length - 1];
	return last?.type === 'instance-context' ? getInstanceContextLabel(last) : undefined;
});

const segments = computed(() => {
	return props.entries.filter(
		(entry): entry is Extract<InstanceAiTimelineEntry, { type: 'text' | 'reasoning' }> =>
			entry.type === 'text' || entry.type === 'reasoning',
	);
});

const durationSec = computed<number | undefined>(() => {
	let start: number | undefined;
	let end: number | undefined;
	for (const entry of props.entries) {
		const toolCall = toolCallFor(entry);
		if (!toolCall) continue;
		const startedAt = toolCall.startedAt ? Date.parse(toolCall.startedAt) : NaN;
		const completedAt = toolCall.completedAt ? Date.parse(toolCall.completedAt) : NaN;
		if (!Number.isNaN(startedAt))
			start = start === undefined ? startedAt : Math.min(start, startedAt);
		if (!Number.isNaN(completedAt))
			end = end === undefined ? completedAt : Math.max(end, completedAt);
	}
	if (start === undefined || end === undefined || end < start) return undefined;
	return Math.max(1, Math.round((end - start) / 1000));
});
</script>

<template>
	<AiThinkingBlock
		:segments="segments"
		:active="props.active"
		:awaiting-input="props.awaitingInput"
		:activity-label="activityLabel"
		:duration-sec="durationSec"
		test-id="instance-ai-thinking-block"
	>
		<template v-for="(entry, index) in props.entries" :key="index">
			<div v-if="entry.type === 'text'" :class="$style.thought">
				<InstanceAiMarkdown
					:content="entry.content"
					:streaming="isStreamingTimelineEntry(props.agentNode, entry)"
				/>
			</div>

			<AiReasoningBlock
				v-else-if="entry.type === 'reasoning'"
				:entry="entry"
				:streaming="isStreamingTimelineEntry(props.agentNode, entry)"
			/>

			<InstanceContextStep v-else-if="entry.type === 'instance-context'" :entry="entry" />

			<N8nAiActivityStep
				v-else-if="entry.type === 'tool-call' && toolCallFor(entry)"
				:label="getToolLabel(toolCallFor(entry)!.toolName, toolCallFor(entry)!.args)"
				:loading="toolCallFor(entry)!.isLoading"
				:error="toolCallFor(entry)!.error"
			>
				<ToolResultJson v-if="toolCallFor(entry)!.args" :value="toolCallFor(entry)!.args" />
				<ToolResultRenderer
					v-if="toolCallFor(entry)!.result !== undefined"
					:result="toolCallFor(entry)!.result"
					:tool-name="toolCallFor(entry)!.toolName"
					:tool-args="toolCallFor(entry)!.args"
				/>
			</N8nAiActivityStep>
		</template>
	</AiThinkingBlock>
</template>

<style lang="scss" module>
.thought {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text--tint-1);
	max-width: 95%;
}
</style>
