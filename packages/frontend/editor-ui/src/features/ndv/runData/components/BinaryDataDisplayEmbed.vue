<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IBinaryData } from 'n8n-workflow';
import { jsonParse, base64DecodeUTF8 } from 'n8n-workflow';
import VueJsonPretty from 'vue-json-pretty';
import RunDataHtml from './RunDataHtml.vue';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	binaryData: IBinaryData;
}>();

const isLoading = ref(true);
const embedSource = ref('');
const error = ref(false);
const data = ref('');

const workflowsStore = useWorkflowsStore();

const i18n = useI18n();

// The renderer choice always comes from mimeType. fileType is supplied by
// the item's producer and does not steer it. An unrecognised, empty or
// absent mimeType gives `other`, which has no dedicated renderer.
const fileType = computed(() => {
	const { mimeType } = props.binaryData;
	if (!mimeType) return 'other';

	// Match on the base type, so a parameter such as `; charset=utf-8` does not
	// stop a type matching. Each single type is compared whole, so a longer name
	// such as `application/pdfx` does not match a shorter one.
	const baseType = mimeType.split(';')[0].trim();

	if (baseType.startsWith('image/')) return 'image';
	if (baseType.startsWith('audio/')) return 'audio';
	if (baseType.startsWith('video/')) return 'video';
	if (baseType === 'application/pdf') return 'pdf';
	if (baseType === 'application/json' || baseType === 'text/json') return 'json';
	if (baseType === 'text/html') return 'html';
	if (baseType === 'text/markdown' || baseType.includes('markdown')) return 'markdown';
	if (baseType.startsWith('text/')) return 'text';
	return 'other';
});

const embedClass = computed(() => {
	return [fileType.value];
});

onMounted(async () => {
	const { id, data: binaryData, fileName, mimeType } = props.binaryData;
	const isJSONData = fileType.value === 'json';
	const isHTMLData = fileType.value === 'html';
	if (!id) {
		if (isJSONData || isHTMLData) {
			data.value = isJSONData
				? jsonParse(base64DecodeUTF8(binaryData))
				: base64DecodeUTF8(binaryData);
		} else {
			embedSource.value = `data:${mimeType};charset=utf-8;base64,${binaryData}`;
		}
	} else {
		try {
			const binaryUrl = workflowsStore.getBinaryUrl(id, 'view', fileName ?? '', mimeType);
			if (isJSONData || isHTMLData) {
				const fetchedData = await fetch(binaryUrl, { credentials: 'include' });
				data.value = await (isJSONData ? fetchedData.json() : fetchedData.text());
			} else {
				embedSource.value = binaryUrl;
			}
		} catch (e) {
			error.value = true;
		}
	}

	isLoading.value = false;
});
</script>

<template>
	<span>
		<div v-if="isLoading">Loading binary data...</div>
		<div v-else-if="error">Error loading binary data</div>
		<span v-else>
			<video v-if="fileType === 'video'" controls autoplay>
				<source :src="embedSource" :type="binaryData.mimeType" />
				{{ i18n.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</video>
			<audio v-else-if="fileType === 'audio'" controls autoplay>
				<source :src="embedSource" :type="binaryData.mimeType" />
				{{ i18n.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</audio>
			<img v-else-if="fileType === 'image'" :src="embedSource" />
			<VueJsonPretty v-else-if="fileType === 'json'" :data="data" :deep="3" :show-length="true" />
			<RunDataHtml v-else-if="fileType === 'html'" :input-html="data" />
			<embed v-else :src="embedSource" class="binary-data" :class="embedClass" />
		</span>
	</span>
</template>

<style lang="scss">
img,
video {
	max-height: 100%;
	max-width: 100%;
}
.binary-data {
	&.other,
	&.pdf {
		height: 100%;
		width: 100%;
	}
}
</style>
