<script lang="ts" setup>
import { computed } from 'vue';
import { saveAs } from 'file-saver';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

/**
 * Maximum number of characters to render in the DOM.
 * Beyond this threshold the JSON is truncated to prevent browser freezes.
 */
const MAX_JSON_DISPLAY_LENGTH = 100_000;

const props = defineProps<{
	value: unknown;
}>();

const i18n = useI18n();

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function highlightJsonString(text: string): string {
	const escaped = escapeHtml(text);

	return escaped.replace(
		/(&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;)\s*:|(&quot;(?:\\.|[^&]|&(?!quot;))*?&quot;)|(true|false|null)|(\d+\.?\d*)/g,
		(
			match,
			key: string | undefined,
			str: string | undefined,
			bool: string | undefined,
			num: string | undefined,
		) => {
			if (key) return `<span class="json-key">${key}</span>:`;
			if (str) return `<span class="json-string">${str}</span>`;
			if (bool) return `<span class="json-bool">${bool}</span>`;
			if (num) return `<span class="json-number">${num}</span>`;
			return match;
		},
	);
}

const jsonString = computed(() => {
	const json = JSON.stringify(props.value, null, 2);
	return json ?? String(props.value);
});

const isTruncated = computed(() => jsonString.value.length > MAX_JSON_DISPLAY_LENGTH);

const highlighted = computed(() => {
	const text = isTruncated.value
		? jsonString.value.slice(0, MAX_JSON_DISPLAY_LENGTH)
		: jsonString.value;
	return highlightJsonString(text);
});

function downloadFullJson() {
	const blob = new Blob([jsonString.value], { type: 'application/json' });
	saveAs(blob, 'tool-result.json');
}
</script>

<template>
	<div>
		<!-- eslint-disable-next-line vue/no-v-html -->
		<pre :class="$style.json" v-html="highlighted" />
		<div v-if="isTruncated" :class="$style.truncatedNotice">
			<span :class="$style.truncatedText">{{
				i18n.baseText('instanceAi.toolResult.dataTruncated')
			}}</span>
			<N8nButton
				variant="outline"
				size="mini"
				:label="i18n.baseText('runData.downloadBinaryData')"
				@click="downloadFullJson"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.json {
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	margin: 0;
	max-height: 200px;
	overflow-y: auto;
	color: var(--color--text--tint-1);
}

.truncatedNotice {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) 0;
}

.truncatedText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
}
</style>

<style lang="scss">
.json-key {
	color: var(--color--primary);
}

.json-string {
	color: var(--color--success);
}

.json-number {
	color: var(--color--warning);
}

.json-bool {
	color: var(--color--text--tint-1);
	font-style: italic;
}
</style>
