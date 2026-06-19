<script lang="ts" setup>
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.loader" data-test-id="instance-ai-canvas-loader">
		<div :class="$style.dots" aria-hidden="true">
			<span :class="$style.dot" />
			<span :class="$style.dot" />
			<span :class="$style.dot" />
		</div>
		<N8nText size="small" :class="$style.hint">
			{{ i18n.baseText('experiments.instanceAiSplitEmptyState.canvas.listening') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.loader {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
}

.dots {
	display: flex;
	gap: var(--spacing--2xs);
}

// Three dots waving in sequence — reads as "listening, waiting for you to submit".
.dot {
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: var(--color--primary);
	animation: listeningWave 1.3s ease-in-out infinite;

	&:nth-child(2) {
		animation-delay: 0.18s;
	}

	&:nth-child(3) {
		animation-delay: 0.36s;
	}
}

.hint {
	color: var(--color--text--tint-1);
}

@keyframes listeningWave {
	0%,
	100% {
		transform: translateY(0);
		opacity: 0.4;
	}
	40% {
		transform: translateY(-10px);
		opacity: 1;
	}
}
</style>
