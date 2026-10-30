<script setup lang="ts">
import type { InboxItem, InboxSelfHealingItem, PromotionReviewType } from '@n8n/api-types';
import {
	N8nAssistantAvatar,
	N8nBadge,
	N8nCard,
	N8nText,
	N8nTimeAgo,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import WorkflowReviewStatusDot from '../reviews/components/WorkflowReviewStatusDot.vue';

defineProps<{ item: InboxItem; selected: boolean }>();
const emit = defineEmits<{ select: [] }>();
const i18n = useI18n();
const rootStore = useRootStore();

// A promotion review shows the icon of its Git host. A new host needs an icon here.
const reviewTypeIcon = { gitlab: 'gitlab' } satisfies Record<PromotionReviewType, IconName>;

function itemTitle(item: InboxItem) {
	switch (item.type) {
		case 'workflow_review':
			return item.title;
		case 'self_healing_result':
			return item.summary;
		case 'promotion_review':
			return item.title ?? item.branchName ?? i18n.baseText('inbox.promotionReview.untitled');
	}
}

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
		role="button"
		tabindex="0"
		:aria-current="selected ? 'true' : undefined"
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
					>{{ itemTitle(item) }}</N8nText
				>
				<WorkflowReviewStatusDot
					v-if="item.type === 'workflow_review'"
					:state="item.state"
					:decision="item.decision"
				/>
				<span
					v-else-if="item.type === 'promotion_review'"
					:class="[$style.statusDot, $style[item.reviewState]]"
					role="img"
					:aria-label="i18n.baseText(`inbox.promotionReview.state.${item.reviewState}`)"
					data-test-id="inbox-promotion-status"
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
				<N8nBadge
					v-if="item.type === 'promotion_review'"
					variant="outline"
					:leading-icon="reviewTypeIcon[item.reviewType]"
					:class="$style.workflowBadge"
					>{{ i18n.baseText('inbox.promotionReview.badge') }}</N8nBadge
				>
				<N8nBadge
					v-else-if="item.workflowName"
					variant="outline"
					leading-icon="workflow"
					:class="$style.workflowBadge"
					:title="item.workflowName"
					>{{ item.workflowName }}</N8nBadge
				>
				<div :class="$style.metaActions">
					<N8nText
						v-if="item.type === 'promotion_review' && item.remoteError"
						size="xsmall"
						color="warning"
						>{{ i18n.baseText(`inbox.promotionReview.remoteError.${item.remoteError}`) }}</N8nText
					>
					<N8nText :class="$style.time" size="xsmall" color="text-light">
						<N8nTimeAgo :date="item.updatedAt" :locale="rootStore.defaultLocale" />
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
.open {
	background-color: var(--color--blue-500);
}
.changes_requested {
	background-color: var(--color--yellow-500);
}
.merged {
	background-color: var(--color--green-500);
}
</style>
