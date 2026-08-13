<script lang="ts" setup>
import type { ProjectFileResponse } from '@n8n/api-types';
import { N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import VueJsonPretty from 'vue-json-pretty';
import type { JSONDataType } from 'vue-json-pretty/types/utils';

import { useProjectFilesStore } from '@/features/core/projectFiles/projectFiles.store';
import { MAX_PREVIEW_TEXT_LENGTH } from '@/features/core/projectFiles/constants';

const props = defineProps<{
	projectId: string;
	file: ProjectFileResponse;
}>();

const i18n = useI18n();
const projectFilesStore = useProjectFilesStore();

const loading = ref(true);
const failed = ref(false);
const text = ref('');
const json = ref<JSONDataType>(null);

const mimeType = computed(() => props.file.mimeType.toLowerCase());

const kind = computed<'image' | 'json' | 'text'>(() => {
	if (mimeType.value.startsWith('image/')) return 'image';
	if (mimeType.value === 'application/json') return 'json';

	// Everything else reaching this component is an allowlisted text type. The
	// allowlist is what makes that safe — never a `startsWith('text/')` check,
	// which would also match text/html.
	return 'text';
});

const imageUrl = computed(() => projectFilesStore.previewUrl(props.projectId, props.file.id));

/** Long text is cut client-side: a multi-MB file inside a <pre> freezes the tab. */
const isTruncated = ref(false);

onMounted(async () => {
	if (kind.value === 'image') {
		loading.value = false;
		return;
	}

	try {
		const contents = await projectFilesStore.fetchFileText(props.projectId, props.file.id);

		if (kind.value === 'json') {
			json.value = JSON.parse(contents);
		} else {
			isTruncated.value = contents.length > MAX_PREVIEW_TEXT_LENGTH;
			text.value = isTruncated.value ? contents.slice(0, MAX_PREVIEW_TEXT_LENGTH) : contents;
		}
	} catch {
		failed.value = true;
	} finally {
		loading.value = false;
	}
});
</script>

<template>
	<div :class="$style.container" data-test-id="project-file-preview">
		<N8nLoading v-if="loading" :rows="4" />

		<N8nText v-else-if="failed" color="text-base" data-test-id="project-file-preview-error">
			{{ i18n.baseText('projectFiles.preview.error') }}
		</N8nText>

		<img
			v-else-if="kind === 'image'"
			:src="imageUrl"
			:alt="props.file.name"
			:class="$style.image"
			data-test-id="project-file-preview-image"
			@error="failed = true"
		/>

		<VueJsonPretty
			v-else-if="kind === 'json'"
			:data="json"
			:deep="3"
			:show-length="true"
			data-test-id="project-file-preview-json"
		/>

		<!-- Interpolated as a text node, never innerHTML: this is what makes
			previewing a file whose bytes are markup safe. -->
		<pre v-else :class="$style.text" data-test-id="project-file-preview-text">{{ text }}</pre>

		<N8nText
			v-if="isTruncated && !loading && !failed"
			size="small"
			color="text-light"
			:class="$style.truncated"
			data-test-id="project-file-preview-truncated"
		>
			{{ i18n.baseText('projectFiles.preview.truncated') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	max-height: 60vh;
	overflow: auto;
}

.image {
	max-width: 100%;
	max-height: 55vh;
	object-fit: contain;
	align-self: center;
}

.text {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
}

.truncated {
	position: sticky;
	bottom: 0;
	padding-top: var(--spacing--3xs);
	background-color: var(--color--background--light-3);
}
</style>
