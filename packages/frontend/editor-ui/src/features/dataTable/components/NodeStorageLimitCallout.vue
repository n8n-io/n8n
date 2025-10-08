<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useNDVStore } from '@/stores/ndv.store';
import { DATA_TABLE_NODES } from '@/constants';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';

import { N8nCallout } from '@n8n/design-system';
const i18n = useI18n();
const nvdStore = useNDVStore();
const dataTableStore = useDataTableStore();

const calloutType = computed(() => {
	if (!DATA_TABLE_NODES.includes(nvdStore.activeNode?.type ?? '')) {
		return null;
	}

	const sizeLimitState = dataTableStore.dataTableSizeLimitState;
	switch (sizeLimitState) {
		case 'error':
			return 'danger';
		case 'warn':
			return 'warning';
		default:
			return null;
	}
});
</script>
<template>
	<N8nCallout v-if="calloutType" :theme="calloutType" class="mt-xs">
		<span v-if="calloutType === 'danger'">
			{{
				i18n.baseText('dataTable.banner.storageLimitError.message', {
					interpolate: {
						usage: `${dataTableStore.dataTableSize} / ${dataTableStore.maxSizeMB}MB`,
					},
				})
			}}
		</span>
		<span v-else>
			{{
				i18n.baseText('dataTable.banner.storageLimitWarning.message', {
					interpolate: {
						usage: `${dataTableStore.dataTableSize} / ${dataTableStore.maxSizeMB}MB`,
					},
				})
			}}
		</span>
	</N8nCallout>
</template>
