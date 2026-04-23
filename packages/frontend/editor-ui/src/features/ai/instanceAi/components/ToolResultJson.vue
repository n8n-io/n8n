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

/**
 * Recursively build syntax-highlighted HTML from a JSON value.
 * Uses a structural walk instead of regex to avoid catastrophic
 * backtracking on large payloads.
 */
function highlightJson(value: unknown, indent = 0): string {
	const pad = '  '.repeat(indent);
	const padInner = '  '.repeat(indent + 1);

	if (value === null) return '<span class="json-bool">null</span>';
	if (typeof value === 'boolean') return `<span class="json-bool">${value}</span>`;
	if (typeof value === 'number') return `<span class="json-number">${value}</span>`;
	if (typeof value === 'string')
		return `<span class="json-string">&quot;${escapeHtml(value)}&quot;</span>`;

	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		const items = value.map((v) => `${padInner}${highlightJson(v, indent + 1)}`);
		return `[\n${items.join(',\n')}\n${pad}]`;
	}

	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) return '{}';
		const lines = entries.map(
			([k, v]) =>
				`${padInner}<span class="json-key">&quot;${escapeHtml(k)}&quot;</span>: ${highlightJson(v, indent + 1)}`,
		);
		return `{\n${lines.join(',\n')}\n${pad}}`;
	}

	return escapeHtml(String(value));
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
	return highlightJson(text);
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
	font-size: var(--font-size--sm);
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
