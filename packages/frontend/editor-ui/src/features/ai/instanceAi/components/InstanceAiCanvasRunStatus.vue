<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	/** What the agent does now. Replaces the building label while it works. */
	statusText?: string;
	/** The run waits on the user in the chat, for an answer or an approval. */
	waiting?: boolean;
}>();

const i18n = useI18n();
</script>

<template>
	<!-- Over the nodes, so the agent's progress is the first thing the user reads. -->
	<div
		:class="[$style.status, { [$style.waiting]: waiting }]"
		role="status"
		aria-live="polite"
		:data-waiting="String(!!waiting)"
		data-test-id="instance-ai-canvas-run-status"
	>
		<!-- The chat is to the left of the canvas. -->
		<N8nIcon
			v-if="waiting"
			icon="arrow-left"
			size="large"
			:class="$style.waitingArrow"
			data-test-id="instance-ai-canvas-run-status-waiting-arrow"
		/>
		<span :class="$style.statusText">
			{{ statusText ?? i18n.baseText('instanceAi.workflowDraft.building') }}
		</span>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.status {
	position: absolute;
	top: 50%;
	left: 50%;
	z-index: 1;
	transform: translate(-50%, -50%);
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	max-width: calc(100% - var(--spacing--2xl));
	padding: var(--spacing--sm) var(--spacing--lg);
	border: var(--border);
	border-radius: var(--radius--xl);
	background: color-mix(in srgb, var(--background--surface) 70%, transparent);
	backdrop-filter: blur(4px);
	box-shadow: var(--shadow--md);
	pointer-events: none;
}

// The agent waits on the user, so the status asks for attention and does not shimmer.
.waiting {
	border-color: var(--color--danger);
	background: color-mix(in srgb, var(--color--danger) 15%, transparent);
	color: var(--color--danger);

	.statusText {
		animation: none;
		background: none;
		color: inherit;
		-webkit-text-fill-color: currentColor;
	}
}

.waitingArrow {
	flex-shrink: 0;
	animation: waiting-nudge 1.2s var(--easing--ease-in-out) infinite;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

@keyframes waiting-nudge {
	50% {
		translate: calc(-1 * var(--spacing--4xs)) 0;
	}
}

// The same shimmer as the loading text in the chat.
.statusText {
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: color-mix(
		in srgb,
		var(--text-color) 35%,
		var(--background--surface) 65%
	);
	--animation--shimmer--foreground: var(--text-color);
	@include motion.shimmer;

	display: block;
	overflow: hidden;
	font-size: var(--font-size--lg);
	line-height: var(--line-height--lg);
	white-space: nowrap;
	text-overflow: ellipsis;
}
</style>
