<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';

import type { TimelineItem } from '../../session-timeline.types';

const props = defineProps<{
	item: TimelineItem;
	selected: boolean;
}>();

const time = computed(() => {
	if (!props.item.timestamp) return '';
	return convertToDisplayDate(new Date(props.item.timestamp).toISOString()).time;
});
</script>

<template>
	<div :class="$style.row">
		<span :class="$style.iconContainer">
			<N8nIcon icon="circle-alert" color="danger" size="medium" />
		</span>
		<N8nText step="xs" bold color="danger">{{ item.content }} </N8nText>
		<N8nText step="xs" color="text-light" bold :class="$style.timestamp">{{ time }}</N8nText>
	</div>
</template>

<style module lang="scss">
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding-inline: var(--spacing--sm);
}
.iconContainer {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	flex-shrink: 0;
	border-radius: var(--radius);
}
.timestamp {
	margin-inline-start: auto;
}
</style>
