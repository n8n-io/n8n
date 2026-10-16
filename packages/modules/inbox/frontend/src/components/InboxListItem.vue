<script setup lang="ts">
import type { InboxItem } from '@n8n/api-types';
import { N8nBadge, N8nCard, N8nIcon, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';

import WorkflowReviewStatusDot from '../reviews/components/WorkflowReviewStatusDot.vue';

defineProps<{ item: InboxItem; selected: boolean }>();
const emit = defineEmits<{ select: [] }>();
const rootStore = useRootStore();
</script>

<template>
	<N8nCard
		:class="[$style.card, { [$style.selected]: selected }]"
		role="option"
		tabindex="0"
		:aria-selected="selected"
		:data-source="item.type"
		data-test-id="inbox-row"
		@click="emit('select')"
		@keydown.enter.prevent="emit('select')"
		@keydown.space.prevent="emit('select')"
	>
		<div :class="$style.cardContent">
			<div :class="$style.cardHeader">
				<N8nText bold tag="h3" :class="$style.cardTitle">{{ item.title }}</N8nText>
				<WorkflowReviewStatusDot :state="item.state" :decision="item.decision" />
			</div>
			<div :class="$style.meta">
				<N8nBadge v-if="item.workflowName" variant="outline" :class="$style.workflowBadge">
					<span :class="$style.workflowBadgeText" :title="item.workflowName"
						><N8nIcon icon="workflow" size="small" /><span>{{ item.workflowName }}</span></span
					>
				</N8nBadge>
				<div :class="$style.metaActions">
					<N8nText :class="$style.time" size="xsmall" color="text-light">
						<N8nTimeAgo :date="item.createdAt" :locale="rootStore.defaultLocale" />
					</N8nText>
				</div>
			</div>
		</div>
	</N8nCard>
</template>

<style module lang="scss">
.card {
	cursor: pointer;
	padding: var(--spacing--xs);
	align-items: stretch;
	border: var(--border-width) solid var(--border-color);
}

.card:hover:not(.selected) {
	background-color: var(--background--hover);
	border-color: transparent;
}

.selected {
	background-color: var(--background--active);
	border-color: transparent;
}
.card:focus-visible {
	border-color: var(--focus--border-color);
}
.cardContent {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	min-width: 0;
	width: 100%;
}
.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
	min-width: 0;
}
.cardTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	font-size: var(--font-size--sm);
}

.meta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: 100%;
	min-width: 0;
}
.workflowBadge {
	flex: 0 1 auto;
	min-width: 0;
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	color: var(--color--text);
	> span {
		max-width: 100%;
	}
}
.workflowBadgeText {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	max-width: 100%;
	min-width: 0;
	line-height: calc(var(--font-size--sm) + var(--border-width));
	> span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}
}
.metaActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	margin-left: auto;
	flex-shrink: 0;
}

.time {
	white-space: nowrap;
}
</style>
