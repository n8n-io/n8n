<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { N8nText } from '@n8n/design-system';
import { useFilesStore } from '@/features/core/files/files.store';
import { formatBytes } from '@/app/utils/typesUtils';

const i18n = useI18n();
const filesStore = useFilesStore();

const caption = computed(() =>
	i18n.baseText('files.meter.caption', {
		interpolate: {
			used: formatBytes(filesStore.usedBytes),
			limit: formatBytes(filesStore.maxBytes),
		},
	}),
);
</script>

<template>
	<div v-if="filesStore.maxBytes > 0" :class="$style.meter" data-test-id="files-storage-meter">
		<N8nText size="small" color="text-light">{{ caption }}</N8nText>
	</div>
</template>

<style lang="scss" module>
.meter {
	display: flex;
	justify-content: flex-end;
	margin-bottom: var(--spacing--3xs);
}
</style>
