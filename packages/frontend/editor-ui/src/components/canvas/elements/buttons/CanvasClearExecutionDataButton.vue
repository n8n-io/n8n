<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>
<template>
	<N8nIconButton
		:title="i18n.baseText('nodeView.deletesTheCurrentExecutionData')"
		icon="trash-2"
		size="large"
		data-test-id="clear-execution-data-button"
	/>
</template>
