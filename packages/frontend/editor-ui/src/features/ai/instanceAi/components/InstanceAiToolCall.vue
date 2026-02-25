<script lang="ts" setup>
import { ref } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiToolCallState } from '../instanceAi.types';

const props = defineProps<{
	toolCall: InstanceAiToolCallState;
}>();

const i18n = useI18n();
const isOpen = ref(false);

function formatJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}
</script>

<template>
	<CollapsibleRoot v-model:open="isOpen" :class="$style.root">
		<CollapsibleTrigger :class="$style.trigger">
			<div :class="$style.triggerContent">
				<N8nIcon
					v-if="props.toolCall.isLoading"
					icon="spinner"
					:class="$style.spinner"
					spin
					size="small"
				/>
				<N8nIcon
					v-else-if="props.toolCall.isError"
					icon="triangle-alert"
					:class="$style.errorIcon"
					size="small"
				/>
				<N8nIcon v-else icon="check" :class="$style.successIcon" size="small" />
				<span :class="$style.toolName">{{ props.toolCall.toolName }}</span>
			</div>
			<N8nIcon :icon="isOpen ? 'chevron-up' : 'chevron-down'" size="small" />
		</CollapsibleTrigger>
		<CollapsibleContent :class="$style.content">
			<div :class="$style.section">
				<div :class="$style.sectionLabel">{{ i18n.baseText('instanceAi.toolCall.input') }}</div>
				<pre :class="$style.json">{{ formatJson(props.toolCall.args) }}</pre>
			</div>
			<div v-if="props.toolCall.result !== undefined" :class="$style.section">
				<div :class="$style.sectionLabel">
					{{
						props.toolCall.isError
							? i18n.baseText('instanceAi.toolCall.error')
							: i18n.baseText('instanceAi.toolCall.output')
					}}
				</div>
				<pre :class="[$style.json, props.toolCall.isError ? $style.errorJson : '']">{{
					formatJson(props.toolCall.result)
				}}</pre>
			</div>
			<div v-else-if="props.toolCall.isLoading" :class="$style.section">
				<div :class="$style.sectionLabel">
					{{ i18n.baseText('instanceAi.toolCall.running') }}
				</div>
			</div>
		</CollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
}

.trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background);
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.triggerContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.toolName {
	font-weight: var(--font-weight--bold);
	font-family: monospace;
}

.spinner {
	color: var(--color--primary);
}

.errorIcon {
	color: var(--color--danger);
}

.successIcon {
	color: var(--color--success);
}

.content {
	border-top: var(--border);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background);
}

.section {
	& + & {
		margin-top: var(--spacing--2xs);
		padding-top: var(--spacing--2xs);
		border-top: 1px dashed var(--color--foreground);
	}
}

.sectionLabel {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-2);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	margin-bottom: var(--spacing--4xs);
}

.json {
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	margin: 0;
	color: var(--color--text--tint-1);
	max-height: 200px;
	overflow-y: auto;
}

.errorJson {
	color: var(--color--danger);
}
</style>
