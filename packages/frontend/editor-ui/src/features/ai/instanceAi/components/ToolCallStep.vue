<script lang="ts" setup>
import type { InstanceAiToolCallState } from '@n8n/api-types';
import { N8nCallout, N8nIcon } from '@n8n/design-system';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import AnimatedCollapsibleContent from './AnimatedCollapsibleContent.vue';
import { useToolLabel } from '../toolLabels';
import DataSection from './DataSection.vue';
import TimelineStepButton from './TimelineStepButton.vue';
import ToolResultJson from './ToolResultJson.vue';
import ToolResultRenderer from './ToolResultRenderer.vue';

const props = defineProps<{
	toolCall: InstanceAiToolCallState;
	/** Override the default label derived from toolName. */
	label?: string;
}>();

defineSlots<{
	default?: () => unknown;
}>();

const { getToolLabel } = useToolLabel();

function getDisplayLabel(tc: InstanceAiToolCallState): string {
	const label = getToolLabel(tc.toolName, tc.args as Record<string, unknown>) || tc.toolName;
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
</script>

<template>
	<CollapsibleRoot v-slot="{ open: isOpen }">
		<CollapsibleTrigger as-child>
			<TimelineStepButton :loading="props.toolCall.isLoading">
				<template #icon>
					<N8nIcon :icon="isOpen ? 'chevron-down' : 'chevron-right'" size="small" />
				</template>
				{{ props.label ?? getDisplayLabel(props.toolCall) }}
			</TimelineStepButton>
		</CollapsibleTrigger>
		<AnimatedCollapsibleContent>
			<DataSection v-if="props.toolCall.args">
				<ToolResultJson :value="props.toolCall.args" />
			</DataSection>
			<DataSection v-if="props.toolCall.result !== undefined">
				<ToolResultRenderer
					:result="props.toolCall.result"
					:tool-name="props.toolCall.toolName"
					:tool-args="props.toolCall.args"
				/>
			</DataSection>
			<N8nCallout v-if="props.toolCall.error !== undefined" theme="danger">
				{{ props.toolCall.error }}
			</N8nCallout>
		</AnimatedCollapsibleContent>
	</CollapsibleRoot>
</template>
