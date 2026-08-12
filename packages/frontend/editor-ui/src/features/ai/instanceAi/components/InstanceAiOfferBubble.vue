<script setup lang="ts">
import { N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	title: string;
	detail?: string;
}>();

defineEmits<{
	accept: [];
	dismiss: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div
		:class="$style.root"
		role="dialog"
		aria-live="polite"
		data-test-id="instance-ai-offer-bubble"
	>
		<div :class="$style.bubble">
			<button
				type="button"
				:class="$style.message"
				data-test-id="instance-ai-offer-bubble-accept"
				@click="$emit('accept')"
			>
				<N8nText tag="span" :class="$style.title">{{ title }}</N8nText>
				<N8nText v-if="detail" tag="span" size="small" color="text-light" :class="$style.detail">
					{{ detail }}
				</N8nText>
			</button>
			<N8nIconButton
				:class="$style.dismiss"
				icon="x"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('instanceAi.proactiveOffer.dismiss')"
				data-test-id="instance-ai-offer-bubble-dismiss"
				@click.stop="$emit('dismiss')"
			/>
			<span :class="$style.tail" aria-hidden="true" />
		</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.root {
	/* Positioned by the launcher dock; shrink-wrap so short copy feels like a chat bubble. */
	width: fit-content;
	max-width: 100%;
	--animation--fade-in-up--duration: var(--duration--base);
	--animation--fade-in-up--translate: var(--spacing--xs);

	@include motion.fade-in-up;
	animation-fill-mode: both;
	/* drop-shadow so the tail picks up the same soft elevation as the body */
	filter: drop-shadow(0 var(--spacing--4xs) var(--spacing--sm) var(--color--black-alpha-100));
}

.bubble {
	position: relative;
	border: var(--border-width) solid var(--border-color--subtle);
	border-radius: var(--radius--xl);
	background-color: var(--background--surface);
}

/* Soft tip aimed at the launcher (bottom-right). */
.tail {
	position: absolute;
	right: var(--spacing--md);
	bottom: calc(-1 * var(--spacing--2xs));
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	background-color: var(--background--surface);
	border-right: var(--border-width) solid var(--border-color--subtle);
	border-bottom: var(--border-width) solid var(--border-color--subtle);
	border-radius: 0 0 var(--radius--4xs) 0;
	transform: rotate(45deg);
}

.message {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	width: 100%;
	min-width: 0;
	margin: 0;
	padding: var(--spacing--sm) var(--spacing--2xl) var(--spacing--sm) var(--spacing--md);
	border: none;
	border-radius: inherit;
	background: transparent;
	text-align: left;
	cursor: pointer;
	color: inherit;
	font: inherit;
	transition: background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		background-color: color-mix(in srgb, var(--color--background) 70%, transparent);
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: -2px;
	}
}

.dismiss {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
	z-index: 1;
	color: var(--color--text--tint-1);
}

.title {
	min-width: 0;
	line-height: var(--line-height--lg);
	color: var(--color--text);
}

.detail {
	min-width: 0;
}
</style>
