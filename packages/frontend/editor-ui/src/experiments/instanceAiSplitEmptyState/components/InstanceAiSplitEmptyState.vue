<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
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

// Auto-cycle the examples: canvas, placeholder and list highlight advance together.
const cycle = useCyclingExamples(EXAMPLES.length, {
	intervalMs: INSTANCE_AI_SPLIT_EMPTY_STATE_CYCLE_MS,
});

// While editing an example's prompt, keep its preview instead of the loader.
const editingExample = ref(false);

// Editing an example stops the cycle for good; the canvas then rests on it
// (`anchorIndex`), previewing others only on hover.
const cycleStopped = ref(false);
const anchorIndex = ref(0);

const hoveredIndex = ref<number | null>(null);

// One source of truth for the rotation: advance only while idle (not writing,
// stopped, or hovering), so pause/resume can't desync into a stuck state.
watch(
	() => props.writing || cycleStopped.value || hoveredIndex.value !== null,
	(shouldPause) => (shouldPause ? cycle.pause() : cycle.resume()),
	{ immediate: true },
);

// Drop the editing flag once the composer clears.
watch(
	() => props.writing,
	(w) => {
		if (!w) editingExample.value = false;
	},
);

const displayedIndex = computed(
	() => hoveredIndex.value ?? (cycleStopped.value ? anchorIndex.value : cycle.activeIndex.value),
);

watch(displayedIndex, (i) => emit('example-change', i, EXAMPLES[i].promptKey), {
	immediate: true,
});

function handleHover(index: number) {
	hoveredIndex.value = index;
}

// On leave, resume the cycle from the previewed example (unless it's stopped).
function handleHoverEnd() {
	if (hoveredIndex.value !== null && !cycleStopped.value) {
		cycle.activeIndex.value = hoveredIndex.value;
	}
	hoveredIndex.value = null;
}

// Pencil edit: pin the canvas to this example and stop the cycle.
function handleEdit(payload: SplitEmptyStateSuggestionSubmitPayload) {
	editingExample.value = true;
	cycleStopped.value = true;
	anchorIndex.value = payload.position - 1;
	hoveredIndex.value = null;
	emit('insert-suggestion', payload);
}

// Composing a from-scratch prompt → loader; cycling or editing an example → preview.
const canvasMode = computed<'preview' | 'loader'>(() =>
	props.writing && !editingExample.value ? 'loader' : 'preview',
);
</script>

<template>
	<div
		:class="[$style.split, isWideViewport && $style.withCanvas]"
		data-test-id="instance-ai-split-empty-state"
	>
		<div :class="$style.chatColumn">
			<div :class="$style.headerSlot">
				<slot name="header"></slot>
			</div>
			<div :class="$style.chatCenter">
				<N8nText tag="h1" size="xlarge" bold :class="$style.title">
					{{ i18n.baseText('experiments.instanceAiSplitEmptyState.emptyState.title') }}
				</N8nText>
				<slot name="input"></slot>
			</div>
			<div :class="$style.examplesBottom">
				<SuggestionList
					:examples="EXAMPLES"
					:active-index="canvasMode === 'loader' ? -1 : displayedIndex"
					:interval-ms="INSTANCE_AI_SPLIT_EMPTY_STATE_CYCLE_MS"
					:paused="cycle.isPaused.value"
					:disabled="props.disabled"
					@hover="handleHover"
					@hover-end="handleHoverEnd"
					@submit="emit('submit-suggestion', $event)"
					@edit="handleEdit"
				/>
			</div>
		</div>
		<CyclingPreviewCanvas
			v-if="isWideViewport"
			:class="$style.canvas"
			:examples="EXAMPLES"
			:active-index="displayedIndex"
			:project-id="props.projectId"
			:mode="canvasMode"
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
	overflow-y: auto;
}

.headerSlot {
	flex-shrink: 0;
}

// The chat (title + input) grows to fill the column and centres itself, which
// pushes the examples to the bottom. Both stay IN FLOW (never absolutely
// pinned), so a short viewport scrolls instead of overlapping. The header slot
// stays flush at the top; only the content below it is inset.
.chatCenter {
	flex: 1 0 auto;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: var(--spacing--lg);
	max-width: 680px;
	width: 100%;
	margin: 0 auto;
	padding-inline: var(--spacing--lg);
	min-width: 0;
}

.examplesBottom {
	flex-shrink: 0;
	max-width: 680px;
	width: 100%;
	margin: 0 auto;
	padding-inline: var(--spacing--lg);
	padding-bottom: var(--spacing--lg);
}

// Wide viewport: chat column on the left, canvas on the right (~2/3). The chat
// column min-width keeps the title on one line.
.withCanvas {
	@media (min-width: $breakpoint) {
		grid-template:
			'chat canvas' 1fr
			/ minmax(420px, 1fr) 2fr;
	}
}

// Wide: the same stack spanning the sidebar width (no 680px cap, no horizontal
// centring) with a roomier inset. The examples stay in flow at the bottom of
// the sidebar — never absolutely pinned — so they can't overlap the chat. The
// header toolbar stays flush at the top.
.withCanvas .chatCenter {
	@media (min-width: $breakpoint) {
		max-width: none;
		width: auto;
		margin: 0;
		padding-inline: var(--spacing--2xl);
	}
}

.withCanvas .examplesBottom {
	@media (min-width: $breakpoint) {
		max-width: none;
		width: auto;
		margin: 0;
		padding: 0 var(--spacing--2xl) var(--spacing--2xl);
	}
}

// Tall wide viewport: take the header and examples OUT of flow (pinned to the
// top and bottom) so the chat fills the column and centres at its true middle,
// aligning vertically with the workflow that the canvas centres in the same
// height. Gated on min-height so shorter viewports keep the in-flow stack
// (which scrolls instead of overlapping).
@media (min-width: $breakpoint) and (min-height: 760px) {
	.withCanvas .headerSlot {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
	}

	.withCanvas .examplesBottom {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
	}
}

.title {
	@include motion.fade-in;
}

.canvas {
	grid-area: canvas;
}
</style>
