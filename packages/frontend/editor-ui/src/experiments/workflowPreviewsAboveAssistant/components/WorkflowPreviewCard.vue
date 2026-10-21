<!-- Experiment cleanup (124_workflow_previews_above_assistant) -->
<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';

import type { WorkflowPreviewExample } from '../types';
import WorkflowPreviewExampleView from './WorkflowPreviewExample.vue';

const props = defineProps<{
	example: WorkflowPreviewExample;
	position: number;
	/** Shows the hovered look without playing the execution, e.g. for a selected card. */
	active?: boolean;
}>();

const emit = defineEmits<{
	'preview-prompt': [];
	'clear-prompt': [];
	use: [];
}>();

const i18n = useI18n();
const card = computed(() => props.example.card);
const previewHovered = ref(false);

function showPreview() {
	previewHovered.value = true;
	emit('preview-prompt');
}

function hidePreview() {
	previewHovered.value = false;
	emit('clear-prompt');
}
</script>

<template>
	<button
		type="button"
		:class="[$style.card, active && $style.active]"
		:aria-current="active || undefined"
		:data-example-id="example.id"
		:data-position="position"
		:data-test-id="`workflow-preview-card-${example.id}`"
		@mouseenter="showPreview"
		@mouseleave="hidePreview"
		@focus="showPreview"
		@blur="hidePreview"
		@click="emit('use')"
	>
		<div :class="$style.diagram">
			<WorkflowPreviewExampleView embedded :example="example" :hovered="previewHovered" />
		</div>
		<h3 :class="$style.title">{{ i18n.baseText(example.titleKey) }}</h3>
		<p :class="$style.quote">{{ i18n.baseText(card.quoteKey) }}</p>
	</button>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.card {
	position: relative;
	isolation: isolate;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	min-width: 0;
	height: 100%;
	margin: 0;
	padding: var(--spacing--md) var(--spacing--sm) var(--spacing--sm);
	overflow: hidden;
	// Matches the unhovered node outline (--preview-line-color, dashed).
	border: 1px dashed light-dark(oklch(0.84 0 0), oklch(0.42 0 0));
	border-radius: var(--radius--lg);
	background: transparent;
	color: inherit;
	text-align: left;
	cursor: pointer;
	transition: border-color var(--duration--snappy) var(--easing--ease-out);

	// Same canvas dots as the previous preview, fading out as the title begins.
	&::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		pointer-events: none;
		background-image: radial-gradient(
			oklch(from var(--canvas--dot--color) l c h / 0.7) 1px,
			transparent 1px
		);
		background-size: var(--spacing--sm) var(--spacing--sm);
		mask-image: linear-gradient(to bottom, black 0%, black 42%, transparent 68%);
		opacity: 0;
		transition: opacity var(--duration--base) var(--easing--ease-out);

		@include motion.reduced-motion;
	}

	&:hover::before,
	&:focus-visible::before,
	&.active::before {
		opacity: 1;
	}

	&:hover,
	&:focus-visible,
	&.active {
		border-style: solid;
		border-color: light-dark(
			oklch(from var(--color--neutral-black) l c h / 0.18),
			oklch(from var(--color--neutral-white) l c h / 0.18)
		);
	}
}

.diagram {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	/* Fixed frame so the scaled workflow cannot change the card height while it builds. */
	height: 168px;
	flex-shrink: 0;
	overflow: hidden;
	pointer-events: none;
}

.title,
.quote {
	opacity: 0.6;
	transition: opacity var(--duration--base) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.card:hover .title,
.card:hover .quote,
.card:focus-visible .title,
.card:focus-visible .quote,
.active .title,
.active .quote {
	opacity: 1;
}

.title {
	margin: 0;
	color: var(--color--text);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--sm);
}

.quote {
	display: -webkit-box;
	margin: 0;
	min-height: calc(var(--font-size--xs) * 1.45 * 3);
	overflow: hidden;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--xs);
	line-height: 1.45;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
}
</style>
