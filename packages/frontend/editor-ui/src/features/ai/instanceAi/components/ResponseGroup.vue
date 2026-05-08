<script lang="ts" setup>
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import AnimatedCollapsibleContent from './AnimatedCollapsibleContent.vue';
import { computed } from 'vue';
import type { ResponseGroupSegment } from '../useTimelineGrouping';
import AgentTimeline from './AgentTimeline.vue';
import TimelineStepButton from './TimelineStepButton.vue';

const props = defineProps<{
	group: ResponseGroupSegment;
	agentNode: InstanceAiAgentNode;
	/** Whether this is the last response group in the timeline. */
	isLast?: boolean;
}>();

const i18n = useI18n();

const summaryText = computed(() => {
	const { toolCallCount, textCount, questionCount, childCount } = props.group;
	const parts: string[] = [];
	if (toolCallCount > 0) {
		parts.push(
			i18n.baseText('instanceAi.activitySummary.toolCalls', {
				interpolate: { count: `${toolCallCount}` },
			}),
		);
	}
	if (textCount > 0) {
		parts.push(
			i18n.baseText('instanceAi.activitySummary.messages', {
				interpolate: { count: `${textCount}` },
			}),
		);
	}
	if (questionCount > 0) {
		parts.push(
			i18n.baseText('instanceAi.activitySummary.questions', {
				interpolate: { count: `${questionCount}` },
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

/** Whether any tool call in this group is still loading. */
const hasLoadingToolCalls = computed(() =>
	props.group.entries.some((e) => {
		if (e.type !== 'tool-call') return false;
		const tc = props.agentNode.toolCalls.find((t) => t.toolCallId === e.toolCallId);
		return tc?.isLoading;
	}),
);

/** Whether any child agent in this group is still active. */
const hasActiveChildren = computed(() =>
	props.group.entries.some((e) => {
		if (e.type !== 'child') return false;
		const child = props.agentNode.children.find((c) => c.agentId === e.agentId);
		return child?.status === 'active';
	}),
);

/** Don't collapse the last group while the agent is still streaming. */
const isLastAndStreaming = computed(() => props.isLast && props.agentNode.status === 'active');

/** Whether this group has enough content to justify a collapsible wrapper. */
const isCollapsible = computed(
	() =>
		!isLastAndStreaming.value &&
		!hasLoadingToolCalls.value &&
		!hasActiveChildren.value &&
		(props.group.toolCallCount > 1 || props.group.childCount > 0),
);
</script>

<template>
	<!-- Collapsible: groups with generic tool calls or children -->
	<CollapsibleRoot v-if="isCollapsible" v-slot="{ open: isOpen }">
		<CollapsibleTrigger as-child>
			<TimelineStepButton size="medium">
				<template #icon>
					<N8nIcon :icon="isOpen ? 'chevron-down' : 'chevron-right'" size="small" />
				</template>
				{{ summaryText }}
			</TimelineStepButton>
		</CollapsibleTrigger>
		<AnimatedCollapsibleContent>
			<AgentTimeline :agent-node="props.agentNode" :visible-entries="props.group.entries" />
		</AnimatedCollapsibleContent>
	</CollapsibleRoot>

	<!-- Flat: groups with only text + special UI (questions, plan-review) -->
	<AgentTimeline v-else :agent-node="props.agentNode" :visible-entries="props.group.entries" />
</template>
