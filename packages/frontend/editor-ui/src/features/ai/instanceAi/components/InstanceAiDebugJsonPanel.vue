<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { formatDebugJson, summarizeJsonValue } from '@n8n/api-types';

const props = withDefaults(
	defineProps<{
		value: unknown;
		label?: string;
		defaultOpen?: boolean;
	}>(),
	{
		defaultOpen: false,
	},
);

const i18n = useI18n();

const preview = computed(() => summarizeJsonValue(props.value));
const formatted = computed(() => formatDebugJson(props.value));
const summaryLabel = computed(() => props.label ?? i18n.baseText('instanceAi.debug.runDebug.json'));
</script>

<template>
	<details :class="$style.root" :open="defaultOpen">
		<summary :class="$style.summary">
			<span :class="$style.summaryLabel">{{ summaryLabel }}</span>
			<code :class="$style.preview">{{ preview }}</code>
		</summary>
		<pre :class="$style.json">{{ formatted }}</pre>
	</details>
</template>

<style lang="scss" module>
.root {
	border: 1px solid var(--color--foreground--tint-2);
	border-radius: var(--radius);
	background: var(--color--background--shade-1);
	overflow: hidden;
}

.summary {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	cursor: pointer;
	list-style: none;
	user-select: none;

	&::-webkit-details-marker {
		display: none;
	}

	&::before {
		content: '▸';
		flex-shrink: 0;
		color: var(--color--text--tint-1);
		transition: transform var(--duration--fast) ease;
	}
}

.root[open] .summary::before {
	transform: rotate(90deg);
}

.summaryLabel {
	flex-shrink: 0;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-1);
}

.preview {
	flex: 1;
	min-width: 0;
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--lg);
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.json {
	margin: 0;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-top: 1px solid var(--color--foreground--tint-2);
	background: var(--background--surface);
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	color: var(--color--text);
	max-height: 420px;
	overflow-y: auto;
}
</style>
