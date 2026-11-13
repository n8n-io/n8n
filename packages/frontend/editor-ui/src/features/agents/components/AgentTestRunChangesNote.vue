<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<p :class="$style.note" data-testid="agent-test-run-changes-note">
		<N8nIcon icon="info" size="small" :class="$style.icon" aria-hidden="true" />
		<span>{{ i18n.baseText('agents.testRun.changesNote') }}</span>
	</p>
</template>

<style module lang="scss">
.note {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	text-align: left;
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
}
</style>
