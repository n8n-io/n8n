<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import VueJsonPretty from 'vue-json-pretty';
import RunDataHtml from './RunDataHtml.vue';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	sourceUrl: string;
	fileType?: string;
	mimeType: string;
}>();

const isLoading = ref(true);
const embedSource = ref('');
const error = ref(false);
const data = ref('');

const i18n = useI18n();

const embedClass = computed(() => {
	return [props.fileType ?? 'other'];
});

onMounted(async () => {
	const isJSONData = props.fileType === 'json';
	const isHTMLData = props.fileType === 'html';

	if (isJSONData || isHTMLData) {
		try {
			const fetchedData = await fetch(props.sourceUrl, { credentials: 'include' });
			data.value = await (isJSONData ? fetchedData.json() : fetchedData.text());
		} catch {
			error.value = true;
		}
	} else {
		embedSource.value = props.sourceUrl;
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
				<source :src="embedSource" :type="mimeType" />
				{{ i18n.baseText('binaryDataDisplay.yourBrowserDoesNotSupport') }}
			</video>
			<audio v-else-if="fileType === 'audio'" controls autoplay>
				<source :src="embedSource" :type="mimeType" />
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
