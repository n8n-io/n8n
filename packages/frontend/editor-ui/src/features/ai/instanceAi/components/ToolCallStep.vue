<script lang="ts" setup>
import type { InstanceAiToolCallState } from '@n8n/api-types';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useElementHover } from '@vueuse/core';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { useTemplateRef } from 'vue';
import { getToolIcon, useToolLabel } from '../toolLabels';
import ToolResultJson from './ToolResultJson.vue';
import ToolResultRenderer from './ToolResultRenderer.vue';

const props = defineProps<{
	toolCall: InstanceAiToolCallState;
	/** Override the default label derived from toolName. */
	label?: string;
	/** Whether to show the vertical connector line below the icon. */
	showConnector?: boolean;
}>();

defineSlots<{
	default?: () => unknown;
}>();

const { getToolLabel, getToggleLabel, getHideLabel } = useToolLabel();

const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const isHovered = useElementHover(triggerRef);

function getDisplayLabel(tc: InstanceAiToolCallState): string {
	const label = getToolLabel(tc.toolName) || tc.toolName;
	if (tc.toolName === 'delegate') {
		const role = typeof tc.args?.role === 'string' ? tc.args.role : '';
		return role ? `${label} (${role})` : label;
	}
	if (tc.toolName === 'web-search' && typeof tc.args?.query === 'string') {
		return `${label}: "${tc.args.query}"`;
	}
	if (tc.toolName === 'fetch-url' && typeof tc.args?.url === 'string') {
		return `${label}: ${tc.args.url}`;
	}
	return label;
}
</script>

<template>
	<CollapsibleRoot v-slot="{ open: isOpen }">
		<CollapsibleTrigger as-child>
			<N8nButton ref="triggerRef" variant="ghost" size="small">
				<template #icon>
					<template v-if="isHovered">
						<N8nIcon v-if="!isOpen" icon="plus" size="small" />
						<N8nIcon v-else icon="minus" size="small" />
					</template>
					<template v-else>
						<template v-if="props.toolCall.isLoading">
							<N8nIcon icon="loader" size="small" transform-origin="center" spin />
						</template>
						<N8nIcon v-else :icon="getToolIcon(props.toolCall.toolName)" size="small" />
					</template>
				</template>
				{{ props.label ?? getDisplayLabel(props.toolCall) }}
			</N8nButton>
		</CollapsibleTrigger>
		<CollapsibleContent>
			<div v-if="props.toolCall.args" :class="$style.dataSection">
				<ToolResultJson :value="props.toolCall.args" />
			</div>
			<div v-if="props.toolCall.result !== undefined" :class="$style.dataSection">
				<ToolResultRenderer :result="props.toolCall.result" :tool-name="props.toolCall.toolName" />
			</div>
			<div
				v-if="props.toolCall.error !== undefined"
				:class="[$style.dataSection, $style.errorText]"
			>
				{{ props.toolCall.error }}
			</div>
		</CollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
.step {
	display: flex;
	gap: var(--spacing--xs);
}

.iconColumn {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 20px;
	flex-shrink: 0;
	padding-top: 2px;
}

.connector {
	width: 1px;
	flex: 1;
	background: var(--color--foreground--shade-1);
	min-height: 12px;
}

.stepIcon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.loadingIcon {
	color: var(--color--primary);
}

.stepContent {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1;
	padding-bottom: var(--spacing--2xs);
}

.stepLabel {
	font-size: var(--font-size--sm);
	color: var(--color--text);
	line-height: var(--line-height--lg);
}

.toggleBlock {
	margin-top: var(--spacing--4xs);
}

.toggleButton {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
	background: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.toggleContent {
	margin-top: var(--spacing--4xs);
	max-height: 300px;
	overflow-y: auto;
}

.dataSection {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	padding: var(--spacing--2xs);

	:global(pre) {
		background: transparent;
		margin: 0;
		padding: 0;
	}

	& + & {
		margin-top: var(--spacing--4xs);
	}
}

.errorText {
	color: var(--color--danger);
	font-family: monospace;
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
