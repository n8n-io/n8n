<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>
<template>
	<N8nIconButton
		class="stop-execution"
		icon="square"
		size="large"
		:title="i18n.baseText('nodeView.stopWaitingForWebhookCall')"
		type="secondary"
		data-test-id="stop-execution-waiting-for-webhook-button"
	/>
</template>
