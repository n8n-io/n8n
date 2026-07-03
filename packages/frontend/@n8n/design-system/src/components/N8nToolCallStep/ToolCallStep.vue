<script lang="ts" setup>
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';

import N8nButton from '../N8nButton';
import N8nCallout from '../N8nCallout';
import N8nIcon from '../N8nIcon';

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
			<N8nButton variant="ghost" size="small" :class="$style.trigger">
				<span :class="{ [$style.label]: true, [$style.shimmer]: props.toolCall.isLoading }">
					{{ props.label ?? getDisplayLabel(props.toolCall) }}
				</span>
				<N8nIcon
					icon="chevron-right"
					size="large"
					:class="[$style.chevron, isOpen && $style.open]"
				/>
			</N8nButton>
		</CollapsibleTrigger>
		<CollapsibleContent :class="$style.content">
			<div v-if="props.toolCall.args" :class="$style.dataSection">
				<pre :class="$style.json">{{ formatData(props.toolCall.args) }}</pre>
			</div>
			<div v-if="props.toolCall.result !== undefined" :class="$style.dataSection">
				<pre :class="$style.json">{{ formatData(props.toolCall.result) }}</pre>
			</div>
			<N8nCallout v-if="props.toolCall.error !== undefined" theme="danger">
				{{ props.toolCall.error }}
			</N8nCallout>
		</CollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.trigger {
	max-width: 90%;
	justify-content: flex-start;
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	position: relative;
	padding-inline: 0;

	--button--padding: 0;
	--button--font-size: var(--font-size--sm);
	--button--color--background-active: transparent;
	--button--color--background-hover: transparent;

	&:hover {
		color: var(--text-color--subtle);
	}
}

.label {
	max-width: 100%;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: normal;
}

.shimmer {
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: var(--text-color--subtler);
	--animation--shimmer--foreground: color-mix(
		in srgb,
		var(--text-color--subtler) 50%,
		var(--background--subtle) 50%
	);

	@include motion.shimmer;
}

.chevron {
	flex-shrink: 0;
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	transform-origin: center;
}

.open {
	transform: rotate(90deg);
}

.content {
	overflow: hidden;

	&[data-state='open'] {
		--animation--collapsible-slide--duration: 0.2s;
		@include motion.collapsible-slide-down;
	}

	&[data-state='closed'] {
		--animation--collapsible-slide--duration: 0.2s;
		@include motion.collapsible-slide-up;
	}
}

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

@media (prefers-reduced-motion: reduce) {
	.chevron {
		transition: none;
	}
}
</style>
