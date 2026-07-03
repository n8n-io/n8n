<script lang="ts" setup>
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';

import N8nAiActivityStepButton from '../N8nAiActivityStepButton';
import N8nAiActivityStepChevron from '../N8nAiActivityStepChevron';
import N8nAnimatedCollapsibleContent from '../N8nAnimatedCollapsibleContent';
import N8nCallout from '../N8nCallout';

type ToolCallState = {
	toolCallId: string;
	toolName: string;
	args?: Record<string, unknown>;
	result?: unknown;
	error?: string;
	isLoading: boolean;
};

const props = defineProps<{
	toolCall: ToolCallState;
	/** Override the default label derived from toolName. */
	label?: string;
}>();

defineSlots<{
	default?: () => unknown;
}>();

function humanizeToolName(toolName: string): string {
	return toolName
		.replace(/[-_]+/g, ' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/^\w/, (char) => char.toUpperCase());
}

function getDisplayLabel(tc: ToolCallState): string {
	const label = humanizeToolName(tc.toolName);
	if (tc.toolName === 'delegate') {
		const role = typeof tc.args?.role === 'string' ? tc.args.role : '';
		return role ? `${label} (${role})` : label;
	}
	if (
		tc.toolName === 'research' &&
		tc.args?.action === 'web-search' &&
		typeof tc.args?.query === 'string'
	) {
		return `${label}: "${tc.args.query}"`;
	}
	if (
		tc.toolName === 'research' &&
		tc.args?.action === 'fetch-url' &&
		typeof tc.args?.url === 'string'
	) {
		return `${label}: ${tc.args.url}`;
	}
	return label;
}

function formatData(data: unknown): string {
	return JSON.stringify(data, null, 2) ?? String(data);
}
</script>

<template>
	<CollapsibleRoot v-slot="{ open: isOpen }">
		<CollapsibleTrigger as-child>
			<N8nAiActivityStepButton size="small" :loading="props.toolCall.isLoading">
				{{ props.label ?? getDisplayLabel(props.toolCall) }}
				<template #suffix>
					<N8nAiActivityStepChevron :open="isOpen" />
				</template>
			</N8nAiActivityStepButton>
		</CollapsibleTrigger>
		<N8nAnimatedCollapsibleContent>
			<div v-if="props.toolCall.args" :class="$style.dataSection">
				<pre :class="$style.json">{{ formatData(props.toolCall.args) }}</pre>
			</div>
			<div v-if="props.toolCall.result !== undefined" :class="$style.dataSection">
				<pre :class="$style.json">{{ formatData(props.toolCall.result) }}</pre>
			</div>
			<N8nCallout v-if="props.toolCall.error !== undefined" theme="danger">
				{{ props.toolCall.error }}
			</N8nCallout>
		</N8nAnimatedCollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
.dataSection {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-2);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius--xs);
	padding: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
	border: var(--border);
	max-width: 90%;
	max-height: 200px;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: light-dark(var(--color--neutral-300), var(--color--neutral-700)) transparent;

	& + & {
		margin-top: var(--spacing--4xs);
	}
}

.json {
	background: transparent;
	font-family: monospace;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	margin: 0;
	padding: 0;
	color: var(--color--text--tint-1);
}
</style>
