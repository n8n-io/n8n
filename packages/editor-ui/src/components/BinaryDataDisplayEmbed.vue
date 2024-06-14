<template>
	<span>
		<div v-if="isLoading">Loading binary data...</div>
		<div v-else-if="error">Error loading binary data</div>
		<span v-else>
			<video v-if="binaryData.fileType === 'video'" controls autoplay>
				<source :src="embedSource" :type="binaryData.mimeType" />
				{{ $locale.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</video>
			<audio v-else-if="binaryData.fileType === 'audio'" controls autoplay>
				<source :src="embedSource" :type="binaryData.mimeType" />
				{{ $locale.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</audio>
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

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { IBinaryData } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import type { PropType } from 'vue';
import VueJsonPretty from 'vue-json-pretty';
import RunDataHtml from '@/components/RunDataHtml.vue';

const props = defineProps({
	binaryData: {
		type: Object as PropType<IBinaryData>,
		required: true,
	},
});

const isLoading = ref(true);
const embedSource = ref('');
const error = ref(false);
const data = ref('');

const workflowsStore = useWorkflowsStore();

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

<style lang="scss">
.binary-data {
	background-color: var(--color-foreground-xlight);

	&.image {
		max-height: calc(100% - 1em);
		max-width: calc(100% - 1em);
	}

	&.other,
	&.pdf {
		height: calc(100% - 1em);
		width: calc(100% - 1em);
	}
}
</style>
