<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { onBeforeUnmount, ref, watch } from 'vue';

import { useBuildManuallyByDefaultStore } from '../stores/buildManuallyByDefault.store';

// The tip shows after a 560ms delay for 3600ms, as in the design prototype.
const HIGHLIGHT_DURATION_MS = 560 + 3600;

const i18n = useI18n();
const store = useBuildManuallyByDefaultStore();

const isHighlighted = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | undefined;

watch(
	() => store.isAssistantButtonHighlightPending,
	(isPending) => {
		if (!isPending || !store.consumeAssistantButtonHighlight()) return;
		isHighlighted.value = true;
		clearTimeout(hideTimer);
		hideTimer = setTimeout(() => {
			isHighlighted.value = false;
		}, HIGHLIGHT_DURATION_MS);
	},
	{ immediate: true },
);

onBeforeUnmount(() => clearTimeout(hideTimer));
</script>

<template>
	<span :class="[$style.wrapper, { [$style.highlighted]: isHighlighted }]">
		<slot />
		<span
			v-if="isHighlighted"
			:class="$style.tip"
			role="status"
			data-test-id="canvas-assistant-button-tip"
		>
			{{ i18n.baseText('experiments.buildManuallyByDefault.assistantButton.tip') }}
		</span>
	</span>
</template>

<style lang="scss" module>
// Keyframes, timings and the tip box come from the design prototype. No duration
// token matches them.
.wrapper {
	--highlight--color: var(--background--brand);

	position: relative;
	display: inline-flex;
	border-radius: var(--radius--full);
}

.highlighted {
	animation: highlight 1900ms ease-out 260ms both;

	svg {
		animation: tint 2200ms ease-in 260ms both;
	}
}

.tip {
	position: absolute;
	top: 50%;
	// No spacing token is 10px.
	right: calc(100% + 10px);
	display: flex;
	align-items: center;
	height: var(--height--sm);
	padding: 0 10px;
	margin-top: calc(var(--height--sm) / -2);
	border-radius: var(--radius--2xs);
	background: var(--color--neutral-800);
	box-shadow: 0 var(--spacing--4xs) var(--spacing--xs) var(--color--black-alpha-400);
	color: var(--color--neutral-white);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xs);
	white-space: nowrap;
	pointer-events: none;
	animation: tip 3600ms ease 560ms both;

	// Arrow that points at the button.
	&::after {
		content: '';
		position: absolute;
		top: 50%;
		right: calc(var(--spacing--4xs) * -1);
		width: var(--spacing--2xs);
		height: var(--spacing--2xs);
		margin-top: calc(var(--spacing--2xs) / -2);
		background: inherit;
		transform: rotate(45deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.highlighted,
	.highlighted svg {
		animation: none;
	}

	.tip {
		animation: none;
	}
}

@keyframes highlight {
	0% {
		background-color: transparent;
		box-shadow: 0 0 0 0 color-mix(in srgb, var(--highlight--color) 50%, transparent);
	}
	15% {
		background-color: color-mix(in srgb, var(--highlight--color) 22%, transparent);
	}
	38% {
		box-shadow: 0 0 0 var(--spacing--2xs) transparent;
	}
	39% {
		box-shadow: 0 0 0 0 color-mix(in srgb, var(--highlight--color) 50%, transparent);
	}
	75% {
		background-color: color-mix(in srgb, var(--highlight--color) 18%, transparent);
		box-shadow: 0 0 0 var(--spacing--2xs) transparent;
	}
	100% {
		background-color: transparent;
		box-shadow: 0 0 0 0 transparent;
	}
}

// No 100% keyframe, so the icon returns to its own color.
@keyframes tint {
	0%,
	45% {
		color: var(--highlight--color);
	}
}

@keyframes tip {
	0% {
		opacity: 0;
		transform: translateX(var(--spacing--3xs));
	}
	8%,
	86% {
		opacity: 1;
		transform: translateX(0);
	}
	100% {
		opacity: 0;
		transform: translateX(0);
	}
}
</style>
