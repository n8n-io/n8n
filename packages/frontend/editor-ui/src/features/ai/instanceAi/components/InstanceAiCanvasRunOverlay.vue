<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { CanvasRunState } from '../composables/useDraftWorkflowPreview';
import AgentBuildingIndicator from './AgentBuildingIndicator.vue';

defineProps<{ state: CanvasRunState }>();

const emit = defineEmits<{ focusChat: [] }>();

const i18n = useI18n();
</script>

<template>
	<!-- The canvas shows no text while the agent works. A run that waits on the user asks for the chat. -->
	<AgentBuildingIndicator
		v-if="state === 'building'"
		:show-label="false"
		data-test-id="instance-ai-draft-building-wave"
	/>
	<div v-else :class="$style.anchor" role="status" aria-live="polite">
		<button
			type="button"
			:class="$style.pill"
			data-test-id="instance-ai-canvas-waiting-pill"
			@click="emit('focusChat')"
		>
			<!-- The chat is to the left of the canvas. -->
			<N8nIcon icon="arrow-left" aria-hidden="true" />
			{{
				i18n.baseText(
					state === 'answer'
						? 'instanceAi.workflowDraft.waitingForAnswer'
						: 'instanceAi.workflowDraft.waitingForApproval',
				)
			}}
		</button>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.anchor {
	position: absolute;
	bottom: var(--spacing--lg);
	inset-inline: 0;
	z-index: 10;
	display: flex;
	justify-content: center;
	pointer-events: none;
	@include motion.fade-in-up;
}

// The same pill as the building label of the agent builder.
.pill {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	height: var(--height--xl);
	padding-inline: var(--spacing--sm);
	border: var(--border-width) solid var(--color--danger);
	border-radius: var(--radius--full);
	background: var(--color--neutral-black);
	color: var(--color--neutral-white);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
	box-shadow: var(--shadow--xl);
	cursor: pointer;
	pointer-events: auto;
	// Nudges toward the chat, which is to the left of the canvas.
	animation: waiting-nudge 1.2s var(--easing--ease-in-out) infinite;
	@include motion.reduced-motion;

	&:hover {
		animation-play-state: paused;
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
	}
}

@keyframes waiting-nudge {
	50% {
		translate: calc(-1 * var(--spacing--2xs)) 0;
	}
}
</style>
