<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';

const dataTableStore = useDataTableStore();
const i18n = useI18n();
</script>

<template>
	<BaseBanner name="DATA_TABLE_STORAGE_LIMIT_WARNING" :dismissible="true" theme="warning">
		<template #mainContent>
			<span>{{
				i18n.baseText('dataTable.banner.storageLimitWarning.message', {
					interpolate: {
						usage: `${dataTableStore.dataTableSize} / ${dataTableStore.maxSizeMB}MB`,
					},
				})
			}}</span>
		</template>
	</BaseBanner>
</template>
