<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { N8nAssistantIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

const STARTER_DELAY_MS = 800;
const TYPING_DURATION_MS = 600;

type StarterStage = 'waiting' | 'typing' | 'message';

const i18n = useI18n();
const stage = ref<StarterStage>('waiting');
const timers: Array<ReturnType<typeof setTimeout>> = [];

onMounted(() => {
	timers.push(
		setTimeout(() => {
			stage.value = 'typing';
		}, STARTER_DELAY_MS),
	);
	timers.push(
		setTimeout(() => {
			stage.value = 'message';
		}, STARTER_DELAY_MS + TYPING_DURATION_MS),
	);
});

onBeforeUnmount(() => {
	for (const timer of timers) {
		clearTimeout(timer);
	}
});
</script>

<template>
	<article
		v-if="stage !== 'waiting'"
		:class="$style.container"
		data-test-id="instance-ai-proactive-starter"
	>
		<div :class="$style.avatar" aria-hidden="true">
			<N8nAssistantIcon size="large" theme="blank" />
		</div>

		<section :class="$style.bubble" aria-live="polite">
			<div
				v-if="stage === 'typing'"
				:class="$style.typing"
				:aria-label="
					i18n.baseText('experiments.instanceAiProactiveAgent.typingLabel' as BaseTextKey)
				"
				role="status"
				data-test-id="instance-ai-proactive-typing"
			>
				<span :class="$style.typingDot" />
				<span :class="$style.typingDot" />
				<span :class="$style.typingDot" />
			</div>

			<N8nText
				v-else
				tag="p"
				size="large"
				:class="$style.message"
				data-test-id="instance-ai-proactive-message"
			>
				{{ i18n.baseText('experiments.instanceAiProactiveAgent.message' as BaseTextKey) }}
			</N8nText>
		</section>
	</article>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.container {
	display: grid;
	grid-template-columns: var(--spacing--xl) minmax(0, 1fr);
	column-gap: var(--spacing--sm);
	align-items: start;
	width: 100%;
	max-width: 720px;
	padding-top: var(--spacing--md);

	@include motion.fade-in-up;
	animation-duration: var(--duration--base);
	animation-fill-mode: both;
}

.avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius--full);
	background: var(--assistant--color--highlight-gradient);
	box-shadow: var(--shadow--xs);
}

.bubble {
	display: inline-flex;
	align-items: center;
	min-height: var(--spacing--xl);
	width: fit-content;
	max-width: min(560px, 100%);
	padding: var(--spacing--sm) var(--spacing--md);
	background: var(--color--background--light-3);
	border-radius: var(--radius--3xs) var(--radius--xl) var(--radius--xl) var(--radius--xl);
}

.message {
	--animation--fade-in-up--duration: var(--duration--base);
	--animation--fade-in-up--translate: var(--spacing--5xs);

	margin: 0;
	color: var(--color--text);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;

	@include motion.fade-in-up;
	animation-fill-mode: both;
}

.typing {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--4xs);
}

.typingDot {
	width: var(--spacing--4xs);
	height: var(--spacing--4xs);
	border-radius: var(--radius--full);
	background: var(--color--text--tint-1);
	animation: typing-dot var(--duration--slow) ease-in-out infinite;

	&:nth-child(2) {
		animation-delay: 120ms;
	}

	&:nth-child(3) {
		animation-delay: 240ms;
	}
}

@keyframes typing-dot {
	0%,
	60%,
	100% {
		opacity: 0.35;
		transform: translateY(0);
	}

	30% {
		opacity: 1;
		transform: translateY(calc(var(--spacing--5xs) * -1));
	}
}

@media (prefers-reduced-motion: reduce) {
	.container,
	.message,
	.typingDot {
		animation: none;
	}

	.typingDot {
		opacity: 0.7;
		transform: none;
	}
}
</style>
