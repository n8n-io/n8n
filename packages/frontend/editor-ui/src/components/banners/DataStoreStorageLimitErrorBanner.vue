<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';

const settingsStore = useSettingsStore();
const dataStoreStore = useDataStoreStore();
const i18n = useI18n();
</script>

<template>
	<BaseBanner name="DATA_STORE_STORAGE_LIMIT_ERROR" :dismissible="false" theme="danger">
		<template #mainContent>
			<span>{{
				i18n.baseText('dataStore.banner.storageLimitError.message', {
					interpolate: {
						usage: `${dataStoreStore.dataStoreSize} / ${settingsStore.dataTableLimits?.maxSize}mb`,
					},
				})
			}}</span>
		</template>
	</BaseBanner>
</template>
