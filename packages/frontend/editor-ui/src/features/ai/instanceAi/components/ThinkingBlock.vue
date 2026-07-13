<script lang="ts" setup>
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import {
	N8nAiActivityStepChevron,
	N8nAiActivityStep,
	N8nAnimatedCollapsibleContent,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, ref, watch } from 'vue';
import { firstSentence, isStreamingTimelineEntry } from '../agentTimeline.utils';
import { useToolLabel } from '../toolLabels';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import ReasoningBlock from './ReasoningBlock.vue';
import ToolResultJson from './ToolResultJson.vue';
import ToolResultRenderer from './ToolResultRenderer.vue';

/**
 * Collapsible thinking-trace block. Wraps a maximal run of trace content —
 * reasoning segments, intermediate narration text, and generic tool calls —
 * behind a single header row (chevron on the right, content indented with a
 * left rail like sub-agent sections).
 *
 * Collapsed by default. While streaming, the header shows a live status
 * line — the first sentence of the latest trace segment, replaced (with a
 * fade) whenever a new segment starts — and the latest tool call on an
 * indented subline until further trace content streams. Once settled the
 * header reads "Thought for Xs".
 */
const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		entries: InstanceAiTimelineEntry[];
		/** True while this block is still receiving stream deltas. */
		active: boolean;
		/** True while the run is paused on a confirmation (HITL). */
		awaitingInput?: boolean;
	}>(),
	{ awaitingInput: false },
);

const i18n = useI18n();
const { getToolLabel } = useToolLabel();

/** Manual toggle override; null = follow the default (collapsed). */
const userToggled = ref<boolean | null>(null);
const expanded = computed(() => userToggled.value ?? false);

// When streaming ends, return to the default state — a block expanded
// mid-stream collapses back to "Thought for Xs", like sub-agent sections.
watch(
	() => props.active,
	() => {
		userToggled.value = null;
	},
);

const toolCallsById = computed(() => {
	const map: Record<string, InstanceAiToolCallState> = {};
	for (const tc of props.agentNode.toolCalls) {
		map[tc.toolCallId] = tc;
	}
	return map;
});

function toolCallFor(entry: InstanceAiTimelineEntry): InstanceAiToolCallState | undefined {
	return entry.type === 'tool-call' ? toolCallsById.value[entry.toolCallId] : undefined;
}

/**
 * The block's latest tool call while it is still the tail entry — shown on an
 * indented subline under the status line. It naturally clears when further
 * trace content streams (no longer the tail), swaps when another tool call
 * starts, and hides when the run settles or pauses for input.
 */
const tailToolCall = computed<InstanceAiToolCallState | undefined>(() => {
	if (!props.active || props.awaitingInput) return undefined;
	const last = props.entries[props.entries.length - 1];
	if (!last || last.type !== 'tool-call') return undefined;
	return toolCallsById.value[last.toolCallId];
});

/** Total duration from the block's tool-call timestamps, if available. */
const durationSec = computed<number | undefined>(() => {
	let start: number | undefined;
	let end: number | undefined;
	for (const entry of props.entries) {
		const tc = toolCallFor(entry);
		if (!tc) continue;
		const startedAt = tc.startedAt ? Date.parse(tc.startedAt) : NaN;
		const completedAt = tc.completedAt ? Date.parse(tc.completedAt) : NaN;
		if (!Number.isNaN(startedAt))
			start = start === undefined ? startedAt : Math.min(start, startedAt);
		if (!Number.isNaN(completedAt))
			end = end === undefined ? completedAt : Math.max(end, completedAt);
	}
	if (start === undefined || end === undefined || end < start) return undefined;
	return Math.max(1, Math.round((end - start) / 1000));
});

function formatDuration(totalSec: number): string {
	if (totalSec < 60) return `${totalSec}s`;
	return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
}

/**
 * Header text plus a key that changes only when a DIFFERENT trace segment
 * takes over the line — so segment replacements fade while token growth
 * within a segment updates in place.
 */
const title = computed<{ key: string; text: string }>(() => {
	if (!props.active) {
		const duration = durationSec.value;
		const text =
			duration === undefined
				? i18n.baseText('instanceAi.thinking.doneFallback')
				: i18n.baseText('instanceAi.thinking.done', {
						interpolate: { duration: formatDuration(duration) },
					});
		return { key: 'done', text };
	}

	if (props.awaitingInput) {
		return { key: 'waiting', text: i18n.baseText('instanceAi.thinking.waitingForInput') };
	}

	// While streaming: the first sentence of the LATEST trace segment
	// (narration or reasoning), replaced when a new segment starts. The line
	// stays put on expand/collapse — swapping it for a generic "Thinking" read
	// as instability. Segments whose streamed content is still blank (reasoning
	// often opens with whitespace) don't take over the line — the previous
	// segment keeps it until real text arrives. Reading entry content here is
	// intentional — this is the only branch that re-renders per token.
	for (let i = props.entries.length - 1; i >= 0; i--) {
		const entry = props.entries[i];
		if (entry.type !== 'text' && entry.type !== 'reasoning') continue;
		const sentence = firstSentence(entry.content);
		if (sentence) return { key: `segment-${i}`, text: sentence };
	}
	return { key: 'active', text: i18n.baseText('instanceAi.thinking.active') };
});
</script>

<template>
	<CollapsibleRoot
		:open="expanded"
		data-test-id="instance-ai-thinking-block"
		@update:open="(value) => (userToggled = value)"
	>
		<CollapsibleTrigger as-child>
			<button
				type="button"
				:class="$style.header"
				:aria-expanded="expanded"
				data-test-id="thinking-block-header"
			>
				<Transition name="thinking-title" mode="out-in">
					<span :key="title.key" :class="$style.title">
						{{ title.text }}
					</span>
				</Transition>
				<N8nAiActivityStepChevron :open="expanded" />
			</button>
		</CollapsibleTrigger>
		<Transition name="thinking-title" mode="out-in">
			<div
				v-if="!expanded && tailToolCall"
				:key="tailToolCall.toolCallId"
				:class="$style.subline"
				data-test-id="thinking-block-tool-line"
			>
				{{ getToolLabel(tailToolCall.toolName, tailToolCall.args) }}
			</div>
		</Transition>
		<N8nAnimatedCollapsibleContent>
			<div :class="$style.content">
				<template v-for="(entry, idx) in props.entries" :key="idx">
					<!-- Intermediate narration message -->
					<div v-if="entry.type === 'text'" :class="$style.thought">
						<InstanceAiMarkdown
							:content="entry.content"
							:streaming="isStreamingTimelineEntry(props.agentNode, entry)"
						/>
					</div>

					<!-- Raw reasoning tokens — nested collapsible, capped scroll -->
					<ReasoningBlock
						v-else-if="entry.type === 'reasoning'"
						:entry="entry"
						:streaming="isStreamingTimelineEntry(props.agentNode, entry)"
					/>

					<!-- Tool call row -->
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
			</div>
		</N8nAnimatedCollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" scoped>
/* Old text drops instantly, new text fades in — with mode="out-in" a leave
 * transition would blank the line for its full duration (worse when segment
 * handoffs chain), so only the enter side animates. */
.thinking-title-enter-active {
	transition: opacity var(--duration--snappy) ease;
}

.thinking-title-enter-from {
	opacity: 0;
}
</style>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	border: 0;
	background: transparent;
	padding: var(--spacing--4xs) 0;
	cursor: pointer;
	text-align: left;
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	/* The design-system reset bolds all <button> elements */
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--lg);

	&:hover {
		color: var(--text-color--subtle);
	}
}

.title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.subline {
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: color-mix(
		in srgb,
		var(--text-color--subtler) 30%,
		var(--background--subtle) 70%
	);
	--animation--shimmer--foreground: var(--text-color--subtler);
	@include motion.shimmer;

	margin-left: var(--spacing--sm);
	max-width: 90%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtler);
}

/* Indented rail, like sub-agent sections */
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) 0 var(--spacing--3xs) var(--spacing--2xs);
	border-left: var(--border);
	margin-left: var(--spacing--xs);
}

.thought {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text--tint-1);
	max-width: 95%;
}
</style>
