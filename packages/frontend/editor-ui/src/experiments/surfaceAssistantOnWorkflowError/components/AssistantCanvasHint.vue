<!-- Experiment cleanup (119_surface_assistant_on_workflow_error) -->
<!-- Hint shown beside the canvas Assistant button while the "Fix with n8n Assistant" button is hovered. -->
<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const CANVAS_BUTTON_SELECTOR = '[data-test-id="instance-ai-canvas-action-button"]';

const i18n = useI18n();
const hintTopPx = ref(0);
const hintRightPx = ref(0);
const hintReady = ref(false);

function updatePosition() {
	const button = document.querySelector(CANVAS_BUTTON_SELECTOR);
	if (!(button instanceof HTMLElement)) {
		hintReady.value = false;
		return;
	}

	const rect = button.getBoundingClientRect();
	hintTopPx.value = rect.top + rect.height / 2;
	hintRightPx.value = window.innerWidth - rect.left;
	hintReady.value = true;
}

onMounted(() => {
	updatePosition();
	window.addEventListener('resize', updatePosition);
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', updatePosition);
});
</script>

<template>
	<Teleport to="body">
		<div
			v-if="hintReady"
			:class="$style.hint"
			data-test-id="workflow-error-nudge-canvas-hint"
			:style="{ top: `${hintTopPx}px`, right: `${hintRightPx}px` }"
		>
			<div :class="$style.card">
				<N8nIcon icon="info" color="text-base" size="large" :class="$style.icon" />
				<N8nText tag="p" size="medium" :class="$style.text">
					{{ i18n.baseText('experiments.surfaceAssistantOnWorkflowError.nudge.canvasHint') }}
				</N8nText>
			</div>
			<N8nIcon icon="arrow-right" color="text-base" size="xlarge" />
		</div>
	</Teleport>
</template>

<style lang="scss" module>
.hint {
	position: fixed;
	z-index: calc(var(--toasts--z) + 1);
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	margin-right: var(--spacing--xs);
	transform: translateY(-50%);
	pointer-events: none;
	animation: hint-in var(--duration--base) var(--easing--ease-out) both;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

.card {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	max-width: 20rem;
	padding: var(--spacing--sm);
	border: var(--border-width) solid var(--border-color);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-2);
	box-shadow: none;
}

.icon {
	flex-shrink: 0;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
}

.text {
	margin: 0;
}

@keyframes hint-in {
	from {
		opacity: 0;
	}

	to {
		opacity: 1;
	}
}
</style>
