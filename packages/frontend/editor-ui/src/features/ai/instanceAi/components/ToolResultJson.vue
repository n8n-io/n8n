<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
	value: unknown;
}>();

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function highlightJson(value: unknown): string {
	const json = JSON.stringify(value, null, 2);
	if (!json) return escapeHtml(String(value));

	// First HTML-escape the entire JSON string to neutralize any embedded markup,
	// then apply syntax-highlighting spans on the safe output.
	const escaped = escapeHtml(json);

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

const highlighted = computed(() => highlightJson(props.value));
</script>

<template>
	<!-- eslint-disable-next-line vue/no-v-html -->
	<pre :class="$style.json" v-html="highlighted" />
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
