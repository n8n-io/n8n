<script lang="ts" setup>
import { computed } from 'vue';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { N8nText, N8nMarkdown } from '@n8n/design-system';
import type { TimelineItem } from '../../session-timeline.types';
import SessionTimelinePill from '../SessionTimelinePill.vue';

interface MessageItem {
	item: TimelineItem;
	senderName: string;
	messageMarkdown: string;
}

const props = defineProps<MessageItem>();

const time = computed(function getTime(): string {
	if (!props.item.timestamp) return '';
	return convertToDisplayDate(new Date(props.item.timestamp).toISOString()).time;
});
</script>

<template>
	<section :class="$style.panelContainer">
		<div :class="$style.panelHeader">
			<div :class="$style.panelHeaderIdentity">
				<SessionTimelinePill :kind="props.item.kind" />
				<N8nText step="sm" bold>{{ props.senderName }}</N8nText>
			</div>
			<N8nText step="xs" color="text-light" bold>{{ time }}</N8nText>
		</div>
		<div :class="$style.panelContent">
			<N8nMarkdown :content="props.messageMarkdown" />
		</div>
	</section>
</template>

<style module lang="scss">
.panelContainer {
	width: 100%;
	display: flex;
	flex-direction: column;
	background-color: var(--background--surface);
	border-radius: var(--radius--lg);
	border: var(--border);
	box-shadow: var(--shadow--xs);
}
.panelHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--sm);
	border-bottom: var(--border);
	border-color: var(--border-color--subtle);
}
.panelHeaderIdentity {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);

	> span {
		line-height: 1;
	}
}
.panelContent {
	padding: var(--spacing--sm);
}
</style>
