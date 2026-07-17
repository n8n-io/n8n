<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

// Accent "actively working" pill for an in-progress run set. Distinct from the
// muted Done/Failed badges (green/orange outline) so a running collection reads
// as busy at a glance, and carries a live "N/M versions complete" count so the
// user sees progress advance. Shared by the compare header and the list card so
// the two surfaces show the same treatment and copy.
defineProps<{
	completed: number;
	total: number;
}>();

const i18n = useI18n();
</script>

<template>
	<span :class="$style.indicator" data-test-id="eval-running-indicator">
		<N8nIcon icon="spinner" size="xsmall" spin />
		<N8nText size="xsmall" :bold="true" :compact="true">
			{{
				i18n.baseText('evaluation.collections.card.runningProgress', {
					interpolate: { completed, total },
				})
			}}
		</N8nText>
	</span>
</template>

<style module lang="scss">
.indicator {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--xl);
	color: var(--color--secondary);
	background-color: var(--color--secondary--tint-1);
	white-space: nowrap;
}
</style>
