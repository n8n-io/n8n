<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { SecurityScanSummary } from '../scanner/types';

defineOptions({ name: 'SecuritySummaryBar' });

defineProps<{
	summary: SecurityScanSummary;
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.bar" data-test-id="security-summary-bar">
		<div :class="[$style.stat, $style.critical]">
			<N8nText tag="span" size="small" bold>{{ summary.critical }}</N8nText>
			<N8nText tag="span" size="small">{{
				i18n.baseText('securityScanner.severity.critical')
			}}</N8nText>
		</div>
		<div :class="[$style.stat, $style.warning]">
			<N8nText tag="span" size="small" bold>{{ summary.warning }}</N8nText>
			<N8nText tag="span" size="small">{{
				i18n.baseText('securityScanner.severity.warning')
			}}</N8nText>
		</div>
		<div :class="[$style.stat, $style.info]">
			<N8nText tag="span" size="small" bold>{{ summary.info }}</N8nText>
			<N8nText tag="span" size="small">{{
				i18n.baseText('securityScanner.severity.info')
			}}</N8nText>
		</div>
	</div>
</template>

<style module>
.bar {
	display: flex;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--sm);
	margin: 0 var(--spacing--sm);
	background-color: light-dark(var(--color--neutral-100), var(--color--foreground--tint-2));
	border: var(--border-width) var(--border-style) light-dark(var(--color--neutral-250), transparent);
	border-radius: var(--radius--lg);
}

.stat {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.critical {
	color: var(--color--danger);
}

.warning {
	color: var(--color--warning--shade-1);
}

.info {
	color: var(--color--text--tint-1);
}
</style>
