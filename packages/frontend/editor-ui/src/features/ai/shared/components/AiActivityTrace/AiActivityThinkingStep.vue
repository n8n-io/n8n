<script setup lang="ts">
import { N8nAiActivityStep } from '@n8n/design-system';
import ChatMarkdown from '../ChatMarkdown/ChatMarkdown.vue';
import { computed } from 'vue';
import type { AiThinkingSegment } from './types';
import { useThinkingLabel } from './useThinkingLabel';

const props = withDefaults(
	defineProps<{
		segments: AiThinkingSegment[];
		active: boolean;
		awaitingInput?: boolean;
		durationSec?: number;
		/** Replaces the latest sentence while active. */
		activityLabel?: string;
		/** Replaces the generic "Thinking" while active. */
		idleLabel?: string;
		/** Replaces "Thought for Ns" when done. */
		settledLabel?: string;
		testId?: string;
	}>(),
	{
		awaitingInput: false,
		durationSec: undefined,
		activityLabel: undefined,
		idleLabel: undefined,
		settledLabel: undefined,
		testId: 'ai-thinking-step',
	},
);

const slots = defineSlots<{
	/** Shows before the segments. */
	prepend?: () => unknown;
}>();

const { label, meta } = useThinkingLabel(() => props);

/** Providers can send empty segments. They would show as blank rows. */
const visibleSegments = computed(() =>
	props.segments.filter((segment) => segment.content.trim().length > 0),
);

const hasContent = computed(() => visibleSegments.value.length > 0 || Boolean(slots.prepend));
</script>

<template>
	<N8nAiActivityStep
		:label="label"
		:meta="meta"
		:loading="props.active && !props.awaitingInput"
		:has-content="hasContent"
		:data-test-id="props.testId"
		:data-active="String(props.active)"
	>
		<div :class="$style.panel">
			<slot name="prepend" />
			<div
				v-for="(segment, index) in visibleSegments"
				:key="segment.id ?? index"
				:class="$style.segment"
				data-test-id="ai-thinking-step-segment"
			>
				<ChatMarkdown
					:content="segment.content.trim()"
					:streaming="props.active && index === visibleSegments.length - 1"
				/>
			</div>
		</div>
	</N8nAiActivityStep>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	max-width: 90%;
	min-width: 0;
	max-height: 240px;
	margin: var(--spacing--3xs) 0 var(--spacing--2xs) var(--spacing--xs);
	padding-left: var(--spacing--2xs);
	border-left: var(--border);
	overflow-x: hidden;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: light-dark(var(--color--neutral-300), var(--color--neutral-700)) transparent;
}

.segment {
	--n8n-markdown--font-size--base: var(--font-size--sm);

	color: var(--color--text--tint-1);
	overflow-wrap: anywhere;
	word-break: break-word;
}
</style>
