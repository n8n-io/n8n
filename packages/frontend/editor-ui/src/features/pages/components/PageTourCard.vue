<script setup lang="ts">
import { N8nButton, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useEventListener } from '@vueuse/core';
import { computed } from 'vue';

import { shouldIgnoreCanvasShortcut } from '@/features/workflows/canvas/canvas.utils';

/**
 * Shows one step of a page tour: the title of the page, the position of the step and its text.
 * Emits `previous`, `next` and `close` from its buttons. The next button reads "Finish" on the last step.
 * ArrowLeft, ArrowRight and Escape do the same from anywhere in the document and reach no other handler.
 * ArrowLeft does nothing on the first step. ArrowRight does nothing on the last step.
 * Keys with a modifier, and keys typed in a field or a dialog, are left alone.
 */
const props = defineProps<{
	pageTitle: string;
	text: string;
	/** The position of the step. The first step has number 1. */
	stepNumber: number;
	stepCount: number;
}>();

const emit = defineEmits<{
	previous: [];
	next: [];
	close: [];
}>();

const i18n = useI18n();

const isFirstStep = computed(() => props.stepNumber === 1);
const isLastStep = computed(() => props.stepNumber === props.stepCount);

const stepCountLabel = computed(() =>
	i18n.baseText('page.tour.stepCount', {
		interpolate: { current: String(props.stepNumber), total: String(props.stepCount) },
	}),
);
const nextLabel = computed(() =>
	i18n.baseText(isLastStep.value ? 'page.tour.finish' : 'page.tour.next'),
);

function goToPreviousStep(): void {
	if (!isFirstStep.value) {
		emit('previous');
	}
}

function goToNextStep(): void {
	if (!isLastStep.value) {
		emit('next');
	}
}

function close(): void {
	emit('close');
}

/** The tour action of each key, by the key name that the browser gives. */
const KEY_ACTIONS: Partial<Record<string, () => void>> = {
	ArrowLeft: goToPreviousStep,
	ArrowRight: goToNextStep,
	Escape: close,
};

function hasModifier(event: KeyboardEvent): boolean {
	return event.shiftKey || event.ctrlKey || event.metaKey || event.altKey;
}

function isTypedElsewhere(event: KeyboardEvent): boolean {
	return event.target instanceof Element && shouldIgnoreCanvasShortcut(event.target);
}

/** Finds the tour action of a key event. A key that the tour leaves alone has none. */
function toTourAction(event: KeyboardEvent): (() => void) | undefined {
	return hasModifier(event) || isTypedElsewhere(event) ? undefined : KEY_ACTIONS[event.key];
}

function runTourKey(event: KeyboardEvent): void {
	const action = toTourAction(event);
	if (action !== undefined) {
		event.preventDefault();
		event.stopPropagation();
		action();
	}
}

// The capture phase runs before the key bindings of the canvas, which also use the arrow keys.
useEventListener(document, 'keydown', runTourKey, { capture: true });
</script>

<template>
	<section
		:class="$style.card"
		:aria-label="i18n.baseText('page.tour.label')"
		data-test-id="page-tour-card"
	>
		<header :class="$style.header">
			<N8nText size="small" :bold="true" :class="$style.title" data-test-id="page-tour-title">
				{{ pageTitle }}
			</N8nText>
			<N8nText
				size="xsmall"
				color="text-light"
				:class="$style.stepCount"
				data-test-id="page-tour-step-count"
			>
				{{ stepCountLabel }}
			</N8nText>
			<N8nTooltip placement="top" :content="i18n.baseText('page.tour.close')">
				<N8nIconButton
					variant="ghost"
					size="small"
					icon="x"
					:aria-label="i18n.baseText('page.tour.close')"
					data-test-id="page-tour-close"
					@click="close"
				/>
			</N8nTooltip>
		</header>
		<N8nText
			tag="p"
			size="medium"
			:class="$style.text"
			aria-live="polite"
			data-test-id="page-tour-text"
		>
			{{ text }}
		</N8nText>
		<footer :class="$style.footer">
			<N8nButton
				variant="outline"
				size="small"
				icon="arrow-left"
				:label="i18n.baseText('page.tour.previous')"
				:disabled="isFirstStep"
				data-test-id="page-tour-previous"
				@click="emit('previous')"
			/>
			<N8nButton
				variant="solid"
				size="small"
				:label="nextLabel"
				data-test-id="page-tour-next"
				@click="emit('next')"
			/>
		</footer>
	</section>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--md);
	color: var(--text-color);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.stepCount {
	flex-shrink: 0;
}

.text {
	max-height: var(--spacing--4xl);
	margin: 0;
	overflow-y: auto;
	scrollbar-width: thin;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
