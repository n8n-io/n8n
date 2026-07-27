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
import { computed, onUnmounted, ref, watch } from 'vue';
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
 * fade) whenever a new segment starts — and a subline with the current
 * activity (running tool call or "Thinking") plus a block-level elapsed
 * counter. Expanding moves the counter into the header. Once settled the
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
 * The block's latest tool call while it is still the tail entry — it labels
 * the subline, naturally handing back to "Thinking" when further trace
 * content streams (no longer the tail) and swapping when another tool call
 * starts. Cleared when the run settles or pauses for input.
 */
const tailToolCall = computed<InstanceAiToolCallState | undefined>(() => {
	if (!props.active || props.awaitingInput) return undefined;
	const last = props.entries[props.entries.length - 1];
	if (!last || last.type !== 'tool-call') return undefined;
	return toolCallsById.value[last.toolCallId];
});

// Block-level elapsed: a single monotonic counter for the counting phase,
// shown on the subline. Deliberately NOT per tool call — parallel or
// back-to-back calls would reset it on every handoff. An HITL pause resets
// it to zero (waiting for the user isn't thinking time); settling freezes it
// so the done title can report the time the user actually watched, which
// tool-call timestamps undercount for reasoning-heavy blocks.
const nowMs = ref(Date.now());
const activeSinceMs = ref<number | null>(null);
const settledElapsedSec = ref(0);
let ticker: ReturnType<typeof setInterval> | null = null;

const blockElapsedSec = computed(() => {
	const live =
		activeSinceMs.value === null
			? 0
			: Math.max(0, Math.floor((nowMs.value - activeSinceMs.value) / 1000));
	return settledElapsedSec.value + live;
});

const isCounting = computed(() => props.active && !props.awaitingInput);

watch(
	isCounting,
	(counting) => {
		if (counting) {
			nowMs.value = Date.now();
			activeSinceMs.value = Date.now();
			ticker ??= setInterval(() => {
				nowMs.value = Date.now();
			}, 1000);
		} else {
			// Settling keeps the observed total for the done title; an HITL
			// pause discards it — the timer restarts at zero on resume.
			settledElapsedSec.value = props.awaitingInput ? 0 : blockElapsedSec.value;
			activeSinceMs.value = null;
			if (ticker) {
				clearInterval(ticker);
				ticker = null;
			}
		}
	},
	{ immediate: true },
);

onUnmounted(() => {
	if (ticker) clearInterval(ticker);
});

/** Subline text: the running tool call's label, or a plain "Thinking" while
 *  the model reasons between calls — the block always carries a live signal. */
const sublineLabel = computed<string>(() => {
	const tc = tailToolCall.value;
	if (tc) return getToolLabel(tc.toolName, tc.args);
	return i18n.baseText('instanceAi.thinking.active');
});

/** Live elapsed label — on the subline while collapsed, in the header while
 *  expanded (the subline is hidden then, but the timing must not vanish). */
const elapsedLabel = computed<string | undefined>(() => {
	const sec = blockElapsedSec.value;
	return sec >= 1 ? formatDuration(sec) : undefined;
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
		// Prefer whichever is larger: the tool-call span (survives reloads) or
		// the elapsed time this client actually observed (covers reasoning
		// before/after tool calls — "watched it think for 8s, says 1s" reads
		// as a bug).
		const observed = settledElapsedSec.value >= 1 ? settledElapsedSec.value : undefined;
		const span = durationSec.value;
		const duration =
			span === undefined ? observed : observed === undefined ? span : Math.max(span, observed);
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
				<span v-if="expanded && isCounting && elapsedLabel" :class="$style.headerElapsed">
					{{ elapsedLabel }}
				</span>
				<N8nAiActivityStepChevron :open="expanded" />
			</button>
		</CollapsibleTrigger>
		<div
			v-if="props.active && !props.awaitingInput && !expanded"
			:class="$style.subline"
			data-test-id="thinking-block-subline"
		>
			<!-- No fade on label swaps — a fade blanks the line for a frame,
			     which reads as flicker on quick tool handoffs. -->
			<span :class="$style.sublineLabel">{{ sublineLabel }}</span>
			<span v-if="elapsedLabel" :class="$style.sublineElapsed"> &middot; {{ elapsedLabel }} </span>
		</div>
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

.headerElapsed {
	flex-shrink: 0;
	font-variant-numeric: tabular-nums;
}

.subline {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--4xs);
	max-width: 90%;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtler);
}

/* Shimmer covers the label only — the timer stays static, matching the
 * pre-trace status bar. */
.sublineLabel {
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: color-mix(
		in srgb,
		var(--text-color--subtler) 30%,
		var(--background--subtle) 70%
	);
	--animation--shimmer--foreground: var(--text-color--subtler);
	@include motion.shimmer;

	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sublineElapsed {
	flex-shrink: 0;
	font-variant-numeric: tabular-nums;
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
