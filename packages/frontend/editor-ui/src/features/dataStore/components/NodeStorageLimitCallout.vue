<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nCallout } from '@n8n/design-system';
import { useNDVStore } from '@/stores/ndv.store';
import { DATA_STORE_NODE_TYPE, DATA_STORE_TOOL_NODE_TYPE } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';

const i18n = useI18n();
const nvdStore = useNDVStore();
const settingsStore = useSettingsStore();
const dataStoreStore = useDataStoreStore();

const calloutType = computed(() => {
	if (
		![DATA_STORE_NODE_TYPE, DATA_STORE_TOOL_NODE_TYPE].includes(nvdStore.activeNode?.type ?? '')
	) {
		return null;
	}

	if (dataStoreStore.dataStoreSize >= settingsStore.dataTableLimits?.maxSize) {
		return 'danger';
	}
	return 'warning';
});
</script>
<template>
	<N8nCallout v-if="calloutType" :theme="calloutType" class="mt-xs">
		<span v-if="calloutType === 'danger'">
			{{
				i18n.baseText('dataStore.banner.storageLimitError.message', {
					interpolate: {
						usage: `${dataStoreStore.dataStoreSize} / ${settingsStore.dataTableLimits?.maxSize}mb`,
					},
				})
			}}
		</span>
		<span v-else>
			{{
				i18n.baseText('dataStore.banner.storageLimitWarning.message', {
					interpolate: {
						usage: `${dataStoreStore.dataStoreSize} / ${settingsStore.dataTableLimits?.maxSize}mb`,
					},
				})
			}}
		</span>
	</N8nCallout>
</template>
