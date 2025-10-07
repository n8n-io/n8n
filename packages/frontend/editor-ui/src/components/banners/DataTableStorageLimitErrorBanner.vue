<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';

const dataTableStore = useDataTableStore();
const i18n = useI18n();
</script>

<template>
	<BaseBanner name="DATA_TABLE_STORAGE_LIMIT_ERROR" :dismissible="true" theme="danger">
		<template #mainContent>
			<span>{{
				i18n.baseText('dataTable.banner.storageLimitError.message', {
					interpolate: {
						usage: `${dataTableStore.dataTableSize} / ${dataTableStore.maxSizeMB}MB`,
					},
				})
			}}</span>
		</template>
	</BaseBanner>
</template>
