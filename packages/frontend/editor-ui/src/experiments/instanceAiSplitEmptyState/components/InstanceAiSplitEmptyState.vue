<script lang="ts" setup>
import { watch } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES,
	INSTANCE_AI_SPLIT_EMPTY_STATE_CYCLE_MS,
	type SplitEmptyStateExample,
	type SplitEmptyStateSuggestionSubmitPayload,
} from '../examples';
import { useCyclingExamples } from '../useCyclingExamples';
import SuggestionList from './SuggestionList.vue';
import CyclingPreviewCanvas from './CyclingPreviewCanvas.vue';

const props = withDefaults(
	defineProps<{
		projectId?: string;
		disabled?: boolean;
		writing?: boolean;
	}>(),
	{ projectId: undefined, disabled: false, writing: false },
);

const emit = defineEmits<{
	'submit-suggestion': [payload: SplitEmptyStateSuggestionSubmitPayload];
	'insert-suggestion': [payload: SplitEmptyStateSuggestionSubmitPayload];
	'example-change': [index: number, promptKey: SplitEmptyStateExample['promptKey']];
}>();

const i18n = useI18n();

// Must match $breakpoint below: the preview canvas is unmounted (not just
// CSS-hidden) on narrow viewports; the examples list stays under the input on
// every viewport.
const isWideViewport = useMediaQuery('(min-width: 1024px)');

const EXAMPLES = INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES;

// Auto-cycle through the examples: the preview canvas rotates, the chat-input
// placeholder types each example's prompt, and the examples list highlights the
// active row in turn.
const cycle = useCyclingExamples(EXAMPLES.length, {
	intervalMs: INSTANCE_AI_SPLIT_EMPTY_STATE_CYCLE_MS,
});

// Pause the rotation while the user is typing; resume when the input clears.
watch(
	() => props.writing,
	(w) => (w ? cycle.pause() : cycle.resume()),
);

watch(cycle.activeIndex, (i) => emit('example-change', i, EXAMPLES[i].promptKey), {
	immediate: true,
});
</script>

<template>
	<div
		:class="[$style.split, isWideViewport && $style.withCanvas]"
		data-test-id="instance-ai-split-empty-state"
	>
		<div :class="$style.chatColumn">
			<slot name="header"></slot>
			<div :class="$style.chatCenter">
				<N8nText tag="h1" size="xlarge" bold :class="$style.title">
					{{ i18n.baseText('experiments.instanceAiSplitEmptyState.emptyState.title') }}
				</N8nText>
				<slot name="input"></slot>
			</div>
			<div :class="$style.examplesBottom">
				<SuggestionList
					:examples="EXAMPLES"
					:active-index="cycle.activeIndex.value"
					:interval-ms="INSTANCE_AI_SPLIT_EMPTY_STATE_CYCLE_MS"
					:paused="cycle.isPaused.value"
					:disabled="props.disabled"
					@hover="cycle.peek"
					@hover-end="cycle.resume"
					@submit="emit('submit-suggestion', $event)"
					@edit="emit('insert-suggestion', $event)"
				/>
			</div>
		</div>
		<CyclingPreviewCanvas
			v-if="isWideViewport"
			:class="$style.canvas"
			:examples="EXAMPLES"
			:active-index="cycle.activeIndex.value"
			:project-id="props.projectId"
			data-test-id="instance-ai-preview-canvas"
		/>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion.scss' as motion;

// Must match the useMediaQuery threshold in the script block.
$breakpoint: 1024px;

// Base layout (narrow / no-canvas): a single centred chat column.
.split {
	display: grid;
	flex: 1;
	min-height: 0;
	grid-template:
		'chat' 1fr
		/ 1fr;
}

.chatColumn {
	grid-area: chat;
	position: relative;
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	min-width: 0;
}

// Chat (title + input) vertically centred across the full column height.
.chatCenter {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: var(--spacing--lg);
	max-width: 680px;
	width: 100%;
	margin: 0 auto;
	padding: var(--spacing--lg);
	min-width: 0;
}

.examplesBottom {
	flex-shrink: 0;
	padding: var(--spacing--lg);
}

// Wide viewport: chat column on the left (~1/3), canvas on the right (~2/3).
.withCanvas {
	@media (min-width: $breakpoint) {
		grid-template:
			'chat canvas' 1fr
			/ minmax(340px, 1fr) 2fr;
	}
}

.withCanvas .chatCenter {
	@media (min-width: $breakpoint) {
		max-width: none;
		width: auto;
		margin: 0;
		padding: var(--spacing--xl) var(--spacing--2xl);
	}
}

// Pin the examples to the very bottom and take them OUT of the flex flow, so
// `.chatCenter` spans the full column height and the chat sits at the true
// vertical centre of the sidebar (not the centre of the band above the list).
.withCanvas .examplesBottom {
	@media (min-width: $breakpoint) {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: var(--spacing--2xl);
	}
}

.title {
	@include motion.fade-in;
}

.canvas {
	grid-area: canvas;
}
</style>
