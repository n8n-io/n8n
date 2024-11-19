<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { IBinaryData } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import VueJsonPretty from 'vue-json-pretty';
import RunDataHtml from '@/components/RunDataHtml.vue';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{
	binaryData: IBinaryData;
}>();

const isLoading = ref(true);
const embedSource = ref('');
const error = ref(false);
const data = ref('');

const workflowsStore = useWorkflowsStore();

const i18n = useI18n();

const embedClass = computed(() => {
	return [props.binaryData.fileType ?? 'other'];
});

onMounted(async () => {
	const { id, data: binaryData, fileName, fileType, mimeType } = props.binaryData;
	const isJSONData = fileType === 'json';
	const isHTMLData = fileType === 'html';

	if (!id) {
		if (isJSONData || isHTMLData) {
			data.value = jsonParse(atob(binaryData));
		} else {
			embedSource.value = 'data:' + mimeType + ';base64,' + binaryData;
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
			<video v-if="binaryData.fileType === 'video'" controls autoplay>
				<source :src="embedSource" :type="binaryData.mimeType" />
				{{ i18n.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</video>
			<audio v-else-if="binaryData.fileType === 'audio'" controls autoplay>
				<source :src="embedSource" :type="binaryData.mimeType" />
				{{ i18n.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</audio>
			<img v-else-if="binaryData.fileType === 'image'" :src="embedSource" />
			<VueJsonPretty
				v-else-if="binaryData.fileType === 'json'"
				:data="data"
				:deep="3"
				:show-length="true"
			/>
			<RunDataHtml v-else-if="binaryData.fileType === 'html'" :input-html="data" />
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
