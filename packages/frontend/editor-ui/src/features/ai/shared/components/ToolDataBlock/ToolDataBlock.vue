<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { saveAs } from 'file-saver';
import { N8nButton, N8nCodeBlock, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { base64ToFile } from '@/app/utils/fileUtils';
import { extractToolContent, toolContentFileName } from './toolContent.utils';
import { formatToolData, MAX_TOOL_DATA_DISPLAY_LENGTH } from './toolData.utils';

/**
 * Shows a tool input or output as a highlighted, copyable code block. A result
 * made of content parts, such as an MCP result, shows its text, images and files.
 */
const props = defineProps<{
	value: unknown;
}>();

const i18n = useI18n();

const contentItems = computed(() => extractToolContent(props.value));
// Images that do not decode show as a file row, so people can still download the data.
const failedImages = ref(new Set<number>());
watch(contentItems, () => {
	failedImages.value = new Set();
});

function onImageError(index: number) {
	failedImages.value = new Set(failedImages.value).add(index);
}
const formatted = computed(() => formatToolData(props.value));
const isTruncated = computed(() => formatted.value.text.length > MAX_TOOL_DATA_DISPLAY_LENGTH);
const displayText = computed(() =>
	isTruncated.value
		? formatted.value.text.slice(0, MAX_TOOL_DATA_DISPLAY_LENGTH)
		: formatted.value.text,
);
// A cut-off JSON string is not valid JSON, so highlighting it would mislead.
const language = computed(() => (isTruncated.value ? 'plaintext' : formatted.value.language));

function downloadFull() {
	const { text, language: kind } = formatted.value;
	const blob = new Blob([text], { type: kind === 'json' ? 'application/json' : 'text/plain' });
	saveAs(blob, kind === 'json' ? 'tool-data.json' : 'tool-data.txt');
}

function downloadFile(data: string, mimeType: string) {
	const fileName = toolContentFileName(mimeType);
	// Never give the blob the tool's MIME type. Where `saveAs` opens the blob URL
	// instead of downloading it, a `text/html` blob would run in the n8n origin.
	saveAs(base64ToFile(data, fileName, 'application/octet-stream'), fileName);
}
</script>

<template>
	<div v-if="contentItems" :class="$style.toolData" data-test-id="ai-tool-data-content">
		<template v-for="(item, index) in contentItems" :key="index">
			<ToolDataBlock v-if="item.type === 'text'" :value="item.text" />
			<div v-else-if="item.type === 'image' && !failedImages.has(index)" :class="$style.binaryPart">
				<img
					:src="`data:${item.mimeType};base64,${item.data}`"
					:alt="i18n.baseText('binaryDataDisplay.imagePreview')"
					:class="$style.image"
					data-test-id="ai-tool-data-image"
					@error="onImageError(index)"
				/>
			</div>
			<div v-else :class="[$style.binaryPart, $style.file]" data-test-id="ai-tool-data-file">
				<N8nText size="small" color="text-light">{{ item.mimeType }}</N8nText>
				<N8nButton
					variant="outline"
					size="mini"
					:label="i18n.baseText('runData.downloadBinaryData')"
					@click="downloadFile(item.data, item.mimeType)"
				/>
			</div>
		</template>
	</div>
	<div v-else :class="$style.toolData" data-test-id="ai-tool-data-block">
		<N8nCodeBlock :code="displayText" :language="language" :class="$style.code" />
		<div v-if="isTruncated" :class="$style.truncatedNotice">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('ai.toolData.truncated') }}
			</N8nText>
			<N8nButton
				variant="outline"
				size="mini"
				:label="i18n.baseText('runData.downloadBinaryData')"
				data-test-id="ai-tool-data-download"
				@click="downloadFull"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.toolData {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.code {
	font-size: var(--font-size--2xs);
	background-color: var(--background--surface);
}

/* Matches the frame of the code blocks, so every part of the result reads as one kind of block. */
.binaryPart {
	padding: var(--spacing--xs);
	border: 0.5px solid var(--border-color);
	border-radius: var(--radius);
	background-color: var(--background--surface);
}

.image {
	display: block;
	max-width: 100%;
	max-height: 320px;
	object-fit: contain;
}

.file,
.truncatedNotice {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
