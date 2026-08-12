<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
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
		<div :class="$style.header">
			<N8nIcon icon="sparkles" size="medium" :class="$style.headerIcon" />
			<div :class="$style.copy">
				<N8nText bold tag="span" :class="$style.title">{{ title }}</N8nText>
				<N8nText v-if="detail" size="small" color="text-light" :class="$style.detail">
					{{ detail }}
				</N8nText>
			</div>
		</div>
		<div :class="$style.actions">
			<N8nButton
				variant="outline"
				size="small"
				data-test-id="instance-ai-offer-bubble-dismiss"
				@click="$emit('dismiss')"
			>
				{{ i18n.baseText('instanceAi.proactiveOffer.dismiss') }}
			</N8nButton>
			<N8nButton
				variant="solid"
				size="small"
				icon="sparkles"
				data-test-id="instance-ai-offer-bubble-accept"
				@click="$emit('accept')"
			>
				{{ i18n.baseText('instanceAi.proactiveOffer.accept') }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
.root {
	position: fixed;
	right: var(--spacing--md);
	bottom: var(--spacing--md);
	z-index: var(--ask-assistant-floating-button--z);
	width: min(22rem, calc(100vw - 2 * var(--spacing--md)));
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
	background-color: var(--color--background--light-3);
	box-shadow: var(--shadow--light);
}

.header {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border-bottom: var(--border);
}

.headerIcon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
	color: var(--color--primary);
}

.copy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.title {
	min-width: 0;
}

.detail {
	min-width: 0;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
}
</style>
