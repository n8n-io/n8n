<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';

import { N8nIconButton } from '@n8n/design-system';
const props = defineProps<{
	size?: 'small' | 'medium' | 'large' | 'xlarge';
}>();
const i18n = useI18n();
</script>
<template>
	<N8nIconButton
		variant="subtle"
		class="stop-execution"
		icon="square"
		:size="props.size ?? 'large'"
		:title="i18n.baseText('nodeView.stopWaitingForWebhookCall')"
		data-test-id="stop-execution-waiting-for-webhook-button"
	/>
</template>
