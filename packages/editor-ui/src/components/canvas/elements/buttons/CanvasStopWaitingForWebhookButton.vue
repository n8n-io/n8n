<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';

const i18n = useI18n();
</script>
<template>
	<N8nIconButton
		class="stop-execution"
		icon="stop"
		size="large"
		:title="i18n.baseText('nodeView.stopWaitingForWebhookCall')"
		type="secondary"
		data-test-id="stop-execution-waiting-for-webhook-button"
	/>
</template>
