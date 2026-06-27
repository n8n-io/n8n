<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	count?: number;
}>();

const i18n = useI18n();
</script>

<template>
	<div
		:class="$style.badge"
		:title="i18n.baseText('sourceControl.reviews.comments.nodeBadge')"
		data-test-id="review-node-comment-badge"
	>
		<N8nIcon icon="message-circle" size="xsmall" />
		<N8nText v-if="count && count > 1" size="small" bold :class="$style.count">{{ count }}</N8nText>
	</div>
</template>

<style module lang="scss">
.badge {
	position: absolute;
	top: calc(-1 * var(--spacing--2xs));
	right: calc(-1 * var(--spacing--2xs));
	z-index: 2;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: var(--radius--lg);
	background: var(--color--primary);
	color: var(--color--text--tint-3);
	box-shadow: var(--shadow--light);
	pointer-events: none;
}

.count {
	line-height: 1;
	color: inherit;
}
</style>
