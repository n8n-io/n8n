<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<span class="n8n-oversized-value">{{ i18n.baseText('dataTable.cell.oversized') }}</span>
</template>

<style lang="scss">
.n8n-oversized-value {
	font-style: italic;
	color: var(--color--warning);
}
</style>
