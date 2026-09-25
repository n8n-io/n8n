<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import type { Component } from 'vue';
import { computed } from 'vue';
import type { EventKind, TimelineItem } from '../session-timeline.types';
import SessionBackgroundJobItem from './timeline-items/SessionBackgroundJobItem.vue';
import SessionCapabilityItem from './timeline-items/SessionCapabilityItem.vue';
import SessionExecutionErrorItem from './timeline-items/SessionExecutionErrorItem.vue';
import SessionHitlItem from './timeline-items/SessionHitlItem.vue';
import SessionMessageItem from './timeline-items/SessionMessageItem.vue';

const props = defineProps<{
	item: TimelineItem;
	selected: boolean;
	searchQuery?: string;
}>();

const i18n = useI18n();

const componentByKind: Record<EventKind, Component> = {
	user: SessionMessageItem,
	agent: SessionMessageItem,
	skill: SessionCapabilityItem,
	tool: SessionCapabilityItem,
	node: SessionCapabilityItem,
	workflow: SessionCapabilityItem,
	'execution-error': SessionExecutionErrorItem,
	suspension: SessionHitlItem,
	'hitl-response': SessionHitlItem,
	'background-task-signal': SessionBackgroundJobItem,
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

	if (kind === 'user' || kind === 'agent') {
		const fallbackSenderName =
			kind === 'user'
				? i18n.baseText('agentSessions.timeline.user')
				: i18n.baseText('agentSessions.timeline.agent');

		return {
			...baseProps,
			senderName: props.item.authorName ?? fallbackSenderName,
			messageMarkdown: props.item.content ?? '',
		};
	}

	return baseProps;
});
</script>

<template>
	<component :is="timelineItemComponent" v-bind="timelineItemProps" :search-query="searchQuery" />
</template>
