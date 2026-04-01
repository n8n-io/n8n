<script lang="ts" setup>
import type { InstanceAiToolCallState } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nIcon } from '@n8n/design-system';
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
			<N8nButton ref="triggerRef" variant="ghost" size="small" :class="$style.block">
				<template #icon>
					<template v-if="isHovered">
						<N8nIcon v-if="!isOpen" icon="plus" size="small" />
						<N8nIcon v-else icon="minus" size="small" />
					</template>
					<template v-else>
						<template v-if="props.toolCall.isLoading">
							<N8nIcon icon="spinner" color="primary" size="small" spin />
						</template>
						<N8nIcon v-else :icon="getToolIcon(props.toolCall.toolName)" size="small" />
					</template>
				</template>
				<span :class="$style.ellipsis">{{ props.label ?? getDisplayLabel(props.toolCall) }}</span>
			</N8nButton>
		</CollapsibleTrigger>
		<CollapsibleContent>
			<div v-if="props.toolCall.args" :class="$style.dataSection">
				<ToolResultJson :value="props.toolCall.args" />
			</div>
			<div v-if="props.toolCall.result !== undefined" :class="$style.dataSection">
				<ToolResultRenderer :result="props.toolCall.result" :tool-name="props.toolCall.toolName" />
			</div>
			<N8nCallout v-if="props.toolCall.error !== undefined" theme="danger">
				{{ props.toolCall.error }}
			</N8nCallout>
		</CollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
.block {
	max-width: 100%;
	justify-content: flex-start;
	:global(.n8n-icon) {
		flex-shrink: 0;
	}
	> *:first-child {
		max-width: 100%;
		overflow: hidden;
	}
}

.ellipsis {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.dataSection {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	padding: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);

	:global(pre) {
		background: transparent;
		margin: 0;
		padding: 0;
	}

	& + & {
		margin-top: var(--spacing--4xs);
	}
}
</style>
