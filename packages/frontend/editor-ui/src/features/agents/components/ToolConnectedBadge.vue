<script setup lang="ts">
/**
 * "✓ Connected" badge rendered next to the gear in configured tool rows.
 * Shared between AgentToolItem (node tools) and the workflow-row markup in
 * AgentToolsModal so the two stay visually in lockstep.
 */
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.badge">
		<N8nIcon icon="check" :size="14" />
		<span>{{ i18n.baseText('agents.tools.connected') }}</span>
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
