<script lang="ts" setup>
import { truncate } from '@n8n/utils/string/truncate';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, inject } from 'vue';

import { aiActivityStepGroupContext } from './context';
import N8nAiActivityStepButton from '../N8nAiActivityStepButton';
import N8nAiActivityStepChevron from '../N8nAiActivityStepChevron';
import N8nAnimatedCollapsibleContent from '../N8nAnimatedCollapsibleContent';
import N8nCallout from '../N8nCallout';
import N8nIcon from '../N8nIcon';
import N8nTooltip from '../N8nTooltip';

type ToolCallState = {
	toolCallId: string;
	toolName: string;
	args?: Record<string, unknown>;
	result?: unknown;
	error?: string;
	isLoading: boolean;
};

const props = withDefaults(
	defineProps<{
		toolCall: ToolCallState;
		/** Override the default label derived from toolName. */
		label?: string;
		/** Whether the step has collapsible content. */
		hasContent?: boolean;
	}>(),
	{
		hasContent: true,
	},
);

defineSlots<{
	default?: () => unknown;
}>();

const MAX_ERROR_TOOLTIP_LENGTH = 160;

const isNested = inject(aiActivityStepGroupContext, false);

const errorTooltip = computed(() =>
	props.toolCall.error ? truncate(props.toolCall.error, MAX_ERROR_TOOLTIP_LENGTH) : '',
);

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
	<div :class="{ [$style.nestedRow]: isNested }">
		<span v-if="isNested" :class="$style.rail">
			<span :class="$style.railDot" />
		</span>
		<CollapsibleRoot v-if="props.hasContent" v-slot="{ open: isOpen }">
			<CollapsibleTrigger as-child>
				<N8nAiActivityStepButton size="small" :loading="props.toolCall.isLoading">
					{{ props.label ?? getDisplayLabel(props.toolCall) }}
					<template #icon>
						<N8nTooltip v-if="props.toolCall.error" placement="top">
							<template #content>
								<span :class="$style.errorTooltip">{{ errorTooltip }}</span>
							</template>
							<N8nIcon
								icon="triangle-alert"
								color="danger"
								size="small"
								:class="$style.toolCallErrorIcon"
							/>
						</N8nTooltip>
					</template>
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
				<N8nCallout
					v-if="props.toolCall.error !== undefined"
					theme="danger"
					:class="$style.toolErrorCallout"
				>
					{{ props.toolCall.error }}
				</N8nCallout>
			</N8nAnimatedCollapsibleContent>
		</CollapsibleRoot>
		<N8nAiActivityStepButton
			v-else
			size="small"
			:loading="props.toolCall.isLoading"
			:interactive="false"
		>
			{{ props.label ?? getDisplayLabel(props.toolCall) }}
			<template #icon>
				<N8nTooltip v-if="props.toolCall.error" placement="top">
					<template #content>
						<span :class="$style.errorTooltip">{{ errorTooltip }}</span>
					</template>
					<N8nIcon
						icon="triangle-alert"
						color="danger"
						size="small"
						:class="$style.toolCallErrorIcon"
					/>
				</N8nTooltip>
			</template>
		</N8nAiActivityStepButton>
	</div>
</template>

<style lang="scss" module>
.nestedRow {
	display: grid;
	grid-template-columns: var(--spacing--md) minmax(0, 1fr);
	column-gap: var(--spacing--3xs);
	margin-left: calc(var(--spacing--4xs) * -1);
}

.rail {
	position: relative;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	align-self: self-start;
	width: var(--spacing--md);
	min-height: var(--spacing--lg);
	height: 100%;

	&::before,
	&::after {
		content: '';
		position: absolute;
		left: 50%;
		width: 1px;
		background-color: var(--border-color);
		transform: translateX(-50%);
	}

	&::before {
		top: 0;
		height: calc(var(--spacing--xs) - var(--spacing--4xs));
	}

	&::after {
		top: calc(var(--spacing--xs) + calc(var(--spacing--3xs) + var(--spacing--4xs)));
		bottom: 0;
	}
}

.nestedRow:first-child .rail::before,
.nestedRow:last-child .rail::after {
	display: none;
}

.railDot {
	position: relative;
	z-index: 1;
	top: var(--spacing--xs);
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: 50%;
	background-color: var(--text-color--subtler);
}

.errorTooltip {
	white-space: pre-wrap;
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

.toolErrorCallout {
	margin-top: var(--spacing--xs);
	max-width: 90%;
}
.toolCallErrorIcon {
	transform: translateY(1px);
}
</style>
