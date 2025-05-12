<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';

const i18n = useI18n();
</script>
<template>
	<N8nIconButton
		:title="i18n.baseText('nodeView.deletesTheCurrentExecutionData')"
		icon="trash"
		size="large"
		data-test-id="clear-execution-data-button"
	/>
</template>
