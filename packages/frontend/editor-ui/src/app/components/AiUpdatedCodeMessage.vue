<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
const i18n = useI18n();

defineProps<{
	nodeName: string;
}>();
</script>

<template>
	<div>
		{{ i18n.baseText('aiAssistant.codeUpdated.message.body1') }}
		<a data-action="openNodeDetail" :data-action-parameter-node="nodeName">{{ nodeName }}</a>
		{{ i18n.baseText('aiAssistant.codeUpdated.message.body2') }}
	</div>
</template>
