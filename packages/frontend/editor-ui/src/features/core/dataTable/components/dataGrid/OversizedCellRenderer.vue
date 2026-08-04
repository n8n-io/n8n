<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nTooltip } from '@n8n/design-system';

const i18n = useI18n();
</script>

<template>
	<N8nTooltip placement="top">
		<template #content>
			{{ i18n.baseText('dataTable.cell.oversized.tooltip') }}
		</template>
		<span class="n8n-oversized-value">{{ i18n.baseText('dataTable.cell.oversized') }}</span>
	</N8nTooltip>
</template>

<style lang="scss">
.n8n-oversized-value {
	font-style: italic;
	color: var(--color--warning);
}
</style>
