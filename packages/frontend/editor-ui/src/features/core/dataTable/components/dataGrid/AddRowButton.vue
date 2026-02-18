<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
const i18n = useI18n();

const props = defineProps<{
	params: {
		onClick: () => void;
		disabled?: boolean;
	};
}>();
</script>

<template>
	<N8nTooltip :content="i18n.baseText('dataTable.addRow.label')">
		<N8nIconButton
			variant="ghost"
			icon="plus"
			:disabled="props.params.disabled"
			@click="props.params.onClick"
		/>
	</N8nTooltip>
</template>
