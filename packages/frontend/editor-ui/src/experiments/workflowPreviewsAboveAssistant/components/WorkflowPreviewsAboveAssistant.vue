<!-- Experiment cleanup (124_workflow_previews_above_assistant) -->
<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useElementSize } from '@vueuse/core';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { WORKFLOW_PREVIEW_EXAMPLES } from '../examples';
import { getReservedPreviewHeight } from '../layout';
import type { WorkflowPreviewExample as WorkflowPreviewExampleData } from '../types';
import WorkflowPreviewExample from './WorkflowPreviewExample.vue';

const emit = defineEmits<{
	'preview-prompt': [promptKey: string | null];
	'use-example': [example: WorkflowPreviewExampleData];
}>();

const i18n = useI18n();

const previewAreaRef = ref<HTMLElement | null>(null);
const { width: previewAreaWidth } = useElementSize(previewAreaRef);
const reservedPreviewHeight = computed(() =>
	getReservedPreviewHeight(WORKFLOW_PREVIEW_EXAMPLES, previewAreaWidth.value),
);

const activeExampleIndex = ref(0);
const firstExampleBuilt = ref(false);
const hovered = ref(false);
const activeExample = computed(
	() => WORKFLOW_PREVIEW_EXAMPLES[activeExampleIndex.value] ?? WORKFLOW_PREVIEW_EXAMPLES[0],
);
const canNavigate = WORKFLOW_PREVIEW_EXAMPLES.length > 1;

function translate(key: string) {
	return i18n.baseText(key as BaseTextKey);
}

function showExampleAtOffset(offset: number) {
	const total = WORKFLOW_PREVIEW_EXAMPLES.length;
	activeExampleIndex.value = (activeExampleIndex.value + offset + total) % total;
}

function handleUnitLeave() {
	hovered.value = false;
	emit('preview-prompt', null);
}
</script>

<template>
	<div :class="$style.container" data-test-id="workflow-previews-above-assistant">
		<div
			:class="[$style.unit, !hovered && $style.unitDimmed]"
			data-test-id="workflow-preview-unit"
			@mouseenter="hovered = true"
			@mouseleave="handleUnitLeave"
		>
			<div
				ref="previewAreaRef"
				:class="[$style.previewArea, hovered && $style.previewAreaHovered]"
				data-test-id="workflow-preview-area"
			>
				<div :class="$style.previewContent" data-test-id="workflow-preview-content">
					<Transition :name="$style.swap" mode="out-in">
						<WorkflowPreviewExample
							:key="activeExampleIndex"
							:example="activeExample"
							:hovered="hovered"
							:reserved-height="reservedPreviewHeight"
							@built="firstExampleBuilt = true"
						/>
					</Transition>
				</div>
			</div>

			<footer
				:class="[$style.caption, !firstExampleBuilt && $style.captionHidden]"
				data-test-id="workflow-preview-caption"
			>
				<div :class="$style.titleRow">
					<N8nButton
						v-if="canNavigate"
						variant="ghost"
						size="xsmall"
						icon-only
						data-test-id="workflow-preview-previous"
						:aria-label="
							i18n.baseText('experiments.workflowPreviewsAboveAssistant.previousExample')
						"
						@click="showExampleAtOffset(-1)"
					>
						<N8nIcon icon="chevron-left" size="small" />
					</N8nButton>

					<h3 :class="$style.title" data-test-id="workflow-preview-title">
						{{ translate(activeExample.titleKey) }}
					</h3>

					<N8nButton
						v-if="canNavigate"
						variant="ghost"
						size="xsmall"
						icon-only
						data-test-id="workflow-preview-next"
						:aria-label="i18n.baseText('experiments.workflowPreviewsAboveAssistant.nextExample')"
						@click="showExampleAtOffset(1)"
					>
						<N8nIcon icon="chevron-right" size="small" />
					</N8nButton>
				</div>

				<N8nButton
					variant="outline"
					size="small"
					:class="[$style.tryExample, hovered && $style.tryExampleVisible]"
					:tabindex="hovered ? undefined : -1"
					data-test-id="workflow-preview-try-example"
					@mouseenter="emit('preview-prompt', activeExample.promptKey)"
					@mouseleave="emit('preview-prompt', null)"
					@click="emit('use-example', activeExample)"
				>
					{{ i18n.baseText('experiments.workflowPreviewsAboveAssistant.tryExample') }}
				</N8nButton>
			</footer>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	min-height: 0;
}

.unit {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	width: 100%;
}

.previewArea {
	position: relative;
	isolation: isolate;
	width: 100%;
	padding: var(--spacing--lg) var(--spacing--xl);

	&::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background-color: var(--canvas--color--background);
		background-image: radial-gradient(
			oklch(from var(--canvas--dot--color) l c h / 0.5) 1px,
			transparent 1px
		);
		background-size: 16px 16px;
		mask-image: radial-gradient(
			ellipse closest-side at center,
			black 40%,
			rgb(0 0 0 / 0.5) 70%,
			transparent 100%
		);
		opacity: 0;
	}
}

.previewAreaHovered::before {
	opacity: 0.7;
}

.previewContent {
	width: 100%;
	transition: opacity var(--duration--base) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.unitDimmed .previewContent {
	opacity: 0.85;
}

.caption {
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--2xs);
	transition:
		opacity var(--duration--base) var(--easing--ease-out),
		transform var(--duration--base) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.unitDimmed .caption {
	opacity: 0.6;
}

.caption.captionHidden {
	opacity: 0;
	transform: translateY(calc(-1 * var(--spacing--2xs)));
	pointer-events: none;
}

.titleRow {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--xl);
}

.title {
	margin: 0;
	color: var(--color--text--base);
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
}

.tryExample {
	opacity: 0;
	transform: translateY(calc(-1 * var(--spacing--3xs)));
	pointer-events: none;
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.tryExampleVisible {
	opacity: 1;
	transform: none;
	pointer-events: auto;
}

.swap:global(-enter-active),
.swap:global(-leave-active) {
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;
}

.swap:global(-enter-from) {
	opacity: 0;
	transform: translateY(var(--spacing--2xs));
}

.swap:global(-leave-to) {
	opacity: 0;
	transform: translateY(calc(-1 * var(--spacing--2xs)));
}
</style>
