<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<N8nText
		size="small"
		color="text-light"
		data-test-id="mcp-onboarding-reminder"
		:class="$style.reminder"
	>
		{{ i18n.baseText('experiments.surfaceMcpToNewCloudUsers.emptyState.reminder') }}
	</N8nText>
</template>

<style lang="scss" module>
.reminder {
	margin-top: var(--spacing--xs);
}
</style>
