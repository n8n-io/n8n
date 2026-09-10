<script setup lang="ts">
import type { ICellRendererParams } from 'ag-grid-community';
import { computed } from 'vue';

import AutomationStatusLink from '@/features/core/dataTable/components/AutomationStatusLink.vue';
import type {
	DataTableRow,
	DataTableRowAutomation,
} from '@/features/core/dataTable/dataTable.types';

const props = defineProps<{
	params: ICellRendererParams<DataTableRow> & { nodeId: string };
}>();

const automation = computed<DataTableRowAutomation | undefined>(() => {
	const list: unknown = props.params.data?.automations;
	if (!Array.isArray(list)) return undefined;
	return (list as DataTableRowAutomation[]).find((entry) => entry.nodeId === props.params.nodeId);
});
</script>

<template>
	<AutomationStatusLink v-if="automation" :automation="automation" />
</template>
