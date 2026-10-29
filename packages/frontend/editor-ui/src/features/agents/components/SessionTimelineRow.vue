<script lang="ts" setup>
import type { AgentChatResumeDto, AgentJsonConfig, AgentThreadMemoryDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import type { Component } from 'vue';
import { computed } from 'vue';
import type { EventKind, TimelineItem } from '../session-timeline.types';
import SessionBackgroundTaskItem from './timeline-items/SessionBackgroundTaskItem.vue';
import SessionBackgroundJobItem from './timeline-items/SessionBackgroundJobItem.vue';
import SessionCapabilityItem from './timeline-items/SessionCapabilityItem.vue';
import SessionExecutionErrorItem from './timeline-items/SessionExecutionErrorItem.vue';
import SessionHitlItem from './timeline-items/SessionHitlItem.vue';
import SessionMemoryItem from './timeline-items/SessionMemoryItem.vue';
import SessionMessageItem from './timeline-items/SessionMessageItem.vue';

const props = defineProps<{
	item: TimelineItem;
	respondToApproval?: (payload: AgentChatResumeDto) => Promise<void>;
	pendingApprovalRunIds?: ReadonlySet<string>;
	selected: boolean;
	searchQuery?: string;
	agentName?: string;
	projectId?: string;
	agentId?: string;
	threadId?: string;
	personalisation?: AgentJsonConfig['personalisation'] | null;
	tools?: AgentJsonConfig['tools'];
	memory?: AgentThreadMemoryDto;
	onMemoryDeleted?: () => void;
}>();

const i18n = useI18n();

const componentByKind: Record<EventKind, Component> = {
	user: SessionMessageItem,
	agent: SessionMessageItem,
	skill: SessionCapabilityItem,
	memory: SessionMemoryItem,
	tool: SessionCapabilityItem,
	node: SessionCapabilityItem,
	workflow: SessionCapabilityItem,
	'execution-error': SessionExecutionErrorItem,
	suspension: SessionHitlItem,
	'hitl-response': SessionHitlItem,
	'background-task-signal': SessionBackgroundJobItem,
	'background-task': SessionBackgroundTaskItem,
};

const timelineItemComponent = computed(function getTimelineItemComponent() {
	return componentByKind[props.item.kind];
});

const timelineItemProps = computed(function getTimelineItemProps() {
	const kind = props.item.kind;
	const baseProps = {
		item: props.item,
		selected: props.selected,
	};

	if (kind === 'background-task') {
		const runId = props.item.backgroundTask?.approval?.runId;
		return {
			respondToApproval: props.respondToApproval,
			agentName: props.agentName,
			tools: props.tools,
			personalisation: props.personalisation,
			approvalPending: runId ? props.pendingApprovalRunIds?.has(runId) : false,
			...baseProps,
			projectId: props.projectId,
			agentId: props.agentId,
			threadId: props.threadId,
		};
	}

	if (kind === 'memory') {
		return {
			...baseProps,
			memory: props.memory,
			projectId: props.projectId,
			agentId: props.agentId,
			threadId: props.threadId,
			onDeleted: props.onMemoryDeleted,
		};
	}

	if (kind === 'user' || kind === 'agent') {
		const fallbackSenderName =
			kind === 'user'
				? i18n.baseText('agentSessions.timeline.user')
				: (props.agentName ?? i18n.baseText('agentSessions.timeline.agent'));

		return {
			...baseProps,
			projectId: props.projectId,
			agentId: props.agentId,
			senderName: props.item.authorName ?? fallbackSenderName,
			messageMarkdown: props.item.content ?? '',
			personalisation: props.personalisation,
		};
	}

	return baseProps;
});
</script>

<template>
	<component :is="timelineItemComponent" v-bind="timelineItemProps" :search-query="searchQuery" />
</template>
