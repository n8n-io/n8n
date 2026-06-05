<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.badge" data-test-id="agent-tool-approval-badge">
		<N8nIcon icon="shield" :size="14" />
		<span>{{ i18n.baseText('agents.tools.needsApproval') }}</span>
	</div>
</template>

<style lang="scss" module>
.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
}
</style>
