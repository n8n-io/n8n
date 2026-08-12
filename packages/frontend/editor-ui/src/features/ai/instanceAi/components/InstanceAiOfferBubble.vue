<script setup lang="ts">
import { N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
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
				<div :class="$style.agentRow">
					<span :class="$style.avatar" aria-hidden="true">
						<N8nIcon icon="sparkles" size="small" />
					</span>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('aiAssistant.name') }}
					</N8nText>
				</div>
				<N8nText bold tag="span" :class="$style.title">{{ title }}</N8nText>
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
.root {
	/* Positioned by the launcher dock. */
	width: 100%;
	filter: drop-shadow(0 4px 14px var(--color--black-alpha-100));
}

.bubble {
	position: relative;
	border: var(--border);
	border-radius: var(--radius--lg) var(--radius--lg) var(--radius--lg) var(--radius--md);
	background-color: var(--color--background--light-3);
}

/* Speech-bubble tip aimed at the launcher circle (bottom-right). */
.tail {
	position: absolute;
	right: var(--spacing--lg);
	bottom: calc(-1 * var(--spacing--xs));
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	background-color: var(--color--background--light-3);
	border-right: var(--border);
	border-bottom: var(--border);
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
	padding: var(--spacing--sm) var(--spacing--2xl) var(--spacing--sm) var(--spacing--sm);
	border: none;
	background: transparent;
	text-align: left;
	cursor: pointer;
	color: inherit;
	font: inherit;

	&:hover {
		background-color: var(--color--background);
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: -2px;
		border-radius: inherit;
	}
}

.dismiss {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
	z-index: 1;
}

.agentRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--5xs);
}

.avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.25rem;
	height: 1.25rem;
	border-radius: 50%;
	color: var(--button--color--text--primary);
	background: var(--color--primary);
	flex-shrink: 0;
}

.title {
	min-width: 0;
}

.detail {
	min-width: 0;
}
</style>
