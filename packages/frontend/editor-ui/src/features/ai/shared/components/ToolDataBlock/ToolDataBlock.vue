<script lang="ts" setup>
import { computed } from 'vue';
import { saveAs } from 'file-saver';
import { N8nButton, N8nCodeBlock, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { formatToolData, MAX_TOOL_DATA_DISPLAY_LENGTH } from './toolData.utils';

/** Shows a tool input or output as a highlighted, copyable code block. */
const props = defineProps<{
	value: unknown;
}>();

const i18n = useI18n();

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
</script>

<template>
	<div :class="$style.toolData" data-test-id="ai-tool-data-block">
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

.truncatedNotice {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
