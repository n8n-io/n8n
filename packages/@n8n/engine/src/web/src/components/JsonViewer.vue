<script lang="ts" setup>
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		data: unknown;
		maxHeight?: string;
	}>(),
	{
		maxHeight: '400px',
	},
);

interface JsonToken {
	type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'bracket' | 'plain';
	text: string;
}

function tokenize(json: string): JsonToken[] {
	const tokens: JsonToken[] = [];
	let i = 0;
	const len = json.length;

	while (i < len) {
		const ch = json[i];

		if (ch === '"') {
			// Find end of string
			let j = i + 1;
			while (j < len) {
				if (json[j] === '\\') {
					j += 2;
				} else if (json[j] === '"') {
					j++;
					break;
				} else {
					j++;
				}
			}
			const str = json.slice(i, j);
			// Check if this is a key (followed by colon)
			let k = j;
			while (
				k < len &&
				(json[k] === ' ' || json[k] === '\t' || json[k] === '\n' || json[k] === '\r')
			)
				k++;
			if (json[k] === ':') {
				tokens.push({ type: 'key', text: str });
			} else {
				tokens.push({ type: 'string', text: str });
			}
			i = j;
		} else if (ch === 't' && json.slice(i, i + 4) === 'true') {
			tokens.push({ type: 'boolean', text: 'true' });
			i += 4;
		} else if (ch === 'f' && json.slice(i, i + 5) === 'false') {
			tokens.push({ type: 'boolean', text: 'false' });
			i += 5;
		} else if (ch === 'n' && json.slice(i, i + 4) === 'null') {
			tokens.push({ type: 'null', text: 'null' });
			i += 4;
		} else if (ch === '-' || (ch >= '0' && ch <= '9')) {
			let j = i;
			while (j < len && /[\d.eE+\-]/.test(json[j])) j++;
			tokens.push({ type: 'number', text: json.slice(i, j) });
			i = j;
		} else if (ch === '{' || ch === '}' || ch === '[' || ch === ']') {
			tokens.push({ type: 'bracket', text: ch });
			i++;
		} else {
			// Whitespace, colons, commas
			let j = i;
			while (
				j < len &&
				!['"', '{', '}', '[', ']', 't', 'f', 'n', '-'].includes(json[j]) &&
				!(json[j] >= '0' && json[j] <= '9')
			)
				j++;
			if (j === i) j = i + 1; // prevent infinite loop
			tokens.push({ type: 'plain', text: json.slice(i, j) });
			i = j;
		}
	}

	return tokens;
}

const formatted = computed(() => {
	try {
		const json = JSON.stringify(props.data, null, 2);
		return tokenize(json);
	} catch {
		return [{ type: 'plain' as const, text: String(props.data) }];
	}
});

const isEmpty = computed(() => {
	return props.data === null || props.data === undefined;
});
</script>

<template>
	<div :class="$style.viewer" :style="{ maxHeight }">
		<div v-if="isEmpty" :class="$style.empty">No data</div>
		<pre v-else :class="$style.pre"><template
			v-for="(token, idx) in formatted"
			:key="idx"
		><span :class="$style[token.type]">{{ token.text }}</span></template></pre>
	</div>
</template>

<style module>
.viewer {
	overflow: auto;
	border-radius: var(--radius-md);
	background: var(--color-bg-light);
	border: 1px solid var(--color-border-light);
}

.pre {
	margin: 0;
	padding: var(--spacing-sm);
	font-family: var(--font-family-mono);
	font-size: var(--font-size-xs);
	line-height: var(--line-height-relaxed);
	white-space: pre-wrap;
	word-break: break-all;
}

.empty {
	padding: var(--spacing-sm);
	color: var(--color-text-placeholder);
	font-style: italic;
	font-size: var(--font-size-sm);
}

.key {
	color: #881391;
}

.string {
	color: #0451a5;
}

.number {
	color: #098658;
}

.boolean {
	color: #0000ff;
}

.null {
	color: var(--color-text-lighter);
}

.bracket {
	color: var(--color-text-light);
	font-weight: var(--font-weight-medium);
}

.plain {
	color: var(--color-text);
}
</style>
