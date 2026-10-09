<script setup lang="ts">
import type { InboxItem, InboxSelfHealingItem } from '@n8n/api-types';
import {
	N8nAssistantAvatar,
	N8nBadge,
	N8nCard,
	N8nIcon,
	N8nText,
	N8nTimeAgo,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import WorkflowReviewStatusDot from '../reviews/components/WorkflowReviewStatusDot.vue';

defineProps<{ item: InboxItem; selected: boolean }>();
const emit = defineEmits<{ select: [] }>();
const i18n = useI18n();
const rootStore = useRootStore();

function outcomeLabel(item: InboxSelfHealingItem) {
	switch (item.outcome) {
		case 'fix_ready':
			return i18n.baseText('inbox.outcome.fixReady');
		case 'needs_you':
			return i18n.baseText('inbox.outcome.needsAttention');
		case 'could_not_fix':
			return i18n.baseText('inbox.outcome.couldNotFix');
	}
}
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
				<N8nAssistantAvatar
					v-if="item.type === 'self_healing_result'"
					size="mini"
					:class="$style.assistantAvatar"
					data-test-id="inbox-assistant-avatar"
				/>
				<N8nText
					bold
					tag="h3"
					:class="[
						$style.cardTitle,
						{ [$style.assistantTitle]: item.type === 'self_healing_result' },
					]"
					>{{ item.type === 'workflow_review' ? item.title : item.summary }}</N8nText
				>
				<WorkflowReviewStatusDot
					v-if="item.type === 'workflow_review'"
					:state="item.state"
					:decision="item.decision"
				/>
				<span
					v-else
					:class="[
						$style.statusDot,
						item.state === 'closed'
							? $style.closed
							: item.outcome === 'fix_ready'
								? $style.fixReady
								: $style.needsAttention,
					]"
					role="img"
					:aria-label="`${i18n.baseText(item.state === 'open' ? 'inbox.tabs.open' : 'inbox.tabs.closed')} | ${outcomeLabel(item)}`"
					data-test-id="inbox-assistant-status"
				/>
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

.assistantTitle {
	flex: 1;
}

.assistantAvatar {
	flex-shrink: 0;
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
.statusDot {
	flex-shrink: 0;
	width: var(--font-size--3xs);
	height: var(--font-size--3xs);
	border-radius: 50%;
}
.fixReady {
	background-color: var(--color--blue-500);
}
.needsAttention {
	background-color: var(--color--yellow-500);
}
.closed {
	background-color: var(--color--neutral-500);
}
</style>
