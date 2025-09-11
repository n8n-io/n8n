<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';

const dataStoreStore = useDataStoreStore();
const i18n = useI18n();
</script>

<template>
	<BaseBanner name="DATA_STORE_STORAGE_LIMIT_WARNING" :dismissible="true" theme="warning">
		<template #mainContent>
			<span>{{
				i18n.baseText('dataStore.banner.storageLimitWarning.message', {
					interpolate: {
						usage: `${dataStoreStore.dataStoreSize} / ${dataStoreStore.maxSizeMB}MB`,
					},
				})
			}}</span>
		</template>
	</BaseBanner>
</template>
