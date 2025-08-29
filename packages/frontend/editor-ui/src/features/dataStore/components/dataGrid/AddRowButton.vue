<script setup lang="ts">
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();

const props = defineProps<{
	params: {
		onClick: () => void;
	};
}>();
</script>

<template>
	<N8nTooltip :content="i18n.baseText('dataStore.addRow.label')">
		<N8nIconButton text type="tertiary" icon="plus" @click="props.params.onClick" />
	</N8nTooltip>
</template>
