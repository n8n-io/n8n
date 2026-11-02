<script lang="ts" setup>
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { N8nAiActivityStep } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useNow } from '@vueuse/core';
import { computed } from 'vue';
import AiThinkingBlock from '../../shared/components/AiThinkingBlock.vue';

import { firstSentence, latestSentence } from '../../shared/thinking.utils';
import { useActiveToolLabel } from '../composables/useRunActivity';
import { useSteadyValue } from '../composables/useSteadyValue';

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

const i18n = useI18n();

function skillUpdateLabel(entry: Extract<InstanceAiTimelineEntry, { type: 'skill-update' }>) {
	return entry.name
		? i18n.baseText(`instanceAi.skillUpdate.${entry.change}`, { interpolate: { name: entry.name } })
		: i18n.baseText(`instanceAi.skillUpdate.${entry.change}.unnamed`);
}

const { getToolLabel } = useToolLabel();
const activeToolLabel = useActiveToolLabel();
// A running source write rotates its label, so the label reads the clock.
const now = useNow({ interval: 1000 });
const { getInstanceContextLabel } = useInstanceContextLabel();

/** The newest reasoning sentence, unless the title already shows it. */
function reasoningLabel(content: string): string | undefined {
	const sentence = latestSentence(content);
	return sentence && sentence !== firstSentence(content) ? sentence : undefined;
}

/** A running call gets the same label as the status bar; a finished one its own. */
function toolCallLabel(toolCall: InstanceAiToolCallState): string {
	return toolCall.isLoading && props.agentNode.status === 'active'
		? activeToolLabel(toolCall, props.agentNode, now.value.getTime())
		: getToolLabel(toolCall.toolName, toolCall.args);
}

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

/** Reuse the context row label while it is the latest active entry. */
const activityLabel = computed<string | undefined>(() => {
	const toolCall = tailToolCall.value;
	if (toolCall) return toolCallLabel(toolCall);

	if (!props.active || props.awaitingInput) return undefined;
	const last = props.entries[props.entries.length - 1];
	if (last?.type === 'reasoning') return reasoningLabel(last.content);
	if (last?.type === 'skill-update') return skillUpdateLabel(last);
	return last?.type === 'instance-context' ? getInstanceContextLabel(last) : undefined;
});

// Held steady like the status bar, so short steps do not flash.
const steadyActivityLabel = useSteadyValue(() => activityLabel.value, { key: (label) => label });

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
		// An interrupted call is stamped when the restarted process sweeps it, which can
		// be hours after the work stopped, so its end time says nothing about the duration.
		const completedAt =
			toolCall.completedAt && !toolCall.interrupted ? Date.parse(toolCall.completedAt) : NaN;
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
		:activity-label="steadyActivityLabel"
		:duration-sec="durationSec"
		test-id="instance-ai-thinking-block"
	>
		<template v-for="(entry, index) in props.entries" :key="index">
			<!-- Reasoning renders inline: the header already shows its first sentence. -->
			<div v-if="entry.type === 'text' || entry.type === 'reasoning'" :class="$style.thought">
				<InstanceAiMarkdown
					:content="entry.content"
					:streaming="isStreamingTimelineEntry(props.agentNode, entry)"
				/>
			</div>

			<InstanceContextStep v-else-if="entry.type === 'instance-context'" :entry="entry" />

			<N8nAiActivityStep
				v-else-if="entry.type === 'skill-update'"
				:label="skillUpdateLabel(entry)"
				data-test-id="instance-ai-skill-update"
			>
				<template v-if="entry.change !== 'unavailable' && entry.content !== undefined">
					<ToolResultJson :value="{ skillId: entry.skillId, name: entry.name }" />
					<ToolResultJson
						:value="{
							success: true,
							skillId: entry.skillId,
							name: entry.name,
							hash: entry.version,
							content: entry.content,
						}"
					/>
				</template>
				<p v-else :class="$style.thought">
					{{
						i18n.baseText(
							entry.change === 'unavailable'
								? 'instanceAi.skillUpdate.unavailable.description'
								: 'instanceAi.skillUpdate.loaded.description',
						)
					}}
				</p>
			</N8nAiActivityStep>

			<N8nAiActivityStep
				v-else-if="entry.type === 'tool-call' && toolCallFor(entry)"
				:label="toolCallLabel(toolCallFor(entry)!)"
				:loading="props.agentNode.status === 'active' && toolCallFor(entry)!.isLoading"
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
	--n8n-markdown--font-size--base: var(--font-size--sm);

	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text--tint-1);
	max-width: 95%;
}
</style>
