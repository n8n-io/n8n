<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.placeholder" data-test-id="compare-workflow-diff-tab">
		<N8nIcon icon="arrow-left-right" size="large" color="text-light" />
		<N8nText size="medium" color="text-light">
			{{ i18n.baseText('evaluation.compare.workflowDiff.comingSoon') }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xl);
	border: 1px dashed var(--border-color--subtle);
	border-radius: var(--radius--md);
}
</style>
