<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import BaseBanner from './BaseBanner.vue';
import { useFilesStore } from '@/features/core/files/files.store';
import { formatBytes } from '@/app/utils/typesUtils';

const filesStore = useFilesStore();
const i18n = useI18n();
</script>

<template>
	<BaseBanner name="FILE_STORAGE_LIMIT_ERROR" :dismissible="true" theme="danger">
		<template #mainContent>
			<span>{{
				i18n.baseText('files.banner.limitExceeded', {
					interpolate: {
						used: formatBytes(filesStore.usedBytes),
						limit: formatBytes(filesStore.maxBytes),
					},
				})
			}}</span>
		</template>
	</BaseBanner>
</template>
