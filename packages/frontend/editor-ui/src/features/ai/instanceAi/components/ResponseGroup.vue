<script lang="ts" setup>
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed } from 'vue';
import { getToolIcon } from '../toolLabels';
import { getGroupToolIcons, type ResponseGroupSegment } from '../useTimelineGrouping';
import AgentTimeline from './AgentTimeline.vue';
import TimelineStepButton from './TimelineStepButton.vue';

const props = defineProps<{
	group: ResponseGroupSegment;
	agentNode: InstanceAiAgentNode;
}>();

const i18n = useI18n();

const summaryText = computed(() => {
	const { toolCallCount, textCount, childCount } = props.group;
	const parts: string[] = [];
	if (toolCallCount > 0) {
		parts.push(
			i18n.baseText('instanceAi.activitySummary.toolCalls', {
				interpolate: { count: `${toolCallCount}` },
			}),
		);
	}
	if (childCount > 0) {
		parts.push(
			i18n.baseText('instanceAi.activitySummary.subagents', {
				interpolate: { count: `${childCount}` },
			}),
		);
	}
	return parts.join(', ');
});

const toolIcons = computed(() =>
	getGroupToolIcons(props.group, props.agentNode.toolCalls, getToolIcon),
);

/** Whether this group has enough content to justify a collapsible wrapper. */
const isCollapsible = computed(() => props.group.toolCallCount > 1 || props.group.childCount > 0);
</script>

<template>
	<!-- Collapsible: groups with generic tool calls or children -->
	<CollapsibleRoot v-if="isCollapsible" v-slot="{ open: isOpen }">
		<CollapsibleTrigger as-child>
			<TimelineStepButton size="medium">
				<template #icon>
					<N8nIcon v-if="!isOpen" icon="chevron-right" size="small" />
					<N8nIcon v-else icon="chevron-down" size="small" />
				</template>
				<span :class="$style.summaryLabel">
					{{ summaryText }}
					<span v-if="toolIcons.length > 0" :class="$style.summaryIcons">
						<N8nIcon v-for="icon in toolIcons" :key="icon" :icon="icon" size="small" />
					</span>
				</span>
			</TimelineStepButton>
		</CollapsibleTrigger>
		<CollapsibleContent>
			<AgentTimeline :agent-node="props.agentNode" :visible-entries="props.group.entries" />
		</CollapsibleContent>
	</CollapsibleRoot>

	<!-- Flat: groups with only text + special UI (questions, plan-review) -->
	<AgentTimeline v-else :agent-node="props.agentNode" :visible-entries="props.group.entries" />
</template>

<style lang="scss" module>
.summaryLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.summaryIcons {
	display: inline-flex;
	gap: var(--spacing--4xs);
	opacity: 0.6;
}
</style>
