<script setup lang="ts">
import type { InboxItem, InboxSelfHealingItem, InboxState } from '@n8n/api-types';
import {
	N8nAssistantAvatar,
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nLoading,
	N8nTabs,
	N8nText,
	N8nTimeAgo,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { useIntersectionObserver } from '@vueuse/core';
import { computed, useTemplateRef } from 'vue';

import { useReviewInboxSectionCollapse } from '../composables/useReviewInboxSectionCollapse';
import type { InboxSectionKey } from '../inbox.constants';
import WorkflowReviewStatusDot from '../reviews/components/WorkflowReviewStatusDot.vue';

export type InboxListSection = {
	key: InboxSectionKey;
	items: InboxItem[];
	loading: boolean;
	loadingMore: boolean;
	hasLoaded: boolean;
	hasMore: boolean;
	hasLoadedMore: boolean;
	error: Error | null;
	partial: boolean;
};

const props = defineProps<{
	sections: InboxListSection[];
	activeTab: InboxState;
	selectedKey: string | null;
	openCount: number | null;
	closedCount: number | null;
}>();
const emit = defineEmits<{
	select: [item: InboxItem];
	clear: [];
	'update:active-tab': [state: InboxState];
	loadMore: [section: InboxSectionKey];
	retry: [section: InboxSectionKey];
	refreshSection: [section: InboxSectionKey];
	refresh: [];
}>();
const i18n = useI18n();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const { isCollapsed, toggleSection } = useReviewInboxSectionCollapse();
const groups = computed(() =>
	props.sections
		.filter(
			(section) =>
				!section.hasLoaded ||
				section.loading ||
				section.error ||
				section.partial ||
				section.items.length > 0 ||
				section.hasMore,
		)
		.map((section) => ({
			...section,
			collapsed: section.key !== 'closed' && isCollapsed(section.key),
		})),
);
const hasLoadedMore = computed(() => props.sections.some((section) => section.hasLoadedMore));
const refreshing = computed(() =>
	props.sections.some((section) => section.loading || section.loadingMore),
);
const listRef = useTemplateRef<HTMLElement>('list');
const loadMoreSentinel = useTemplateRef<HTMLElement>('loadMoreSentinel');
const canAutoLoad = computed(() => {
	const closed = props.sections.find((section) => section.key === 'closed');
	return (
		props.activeTab === 'closed' &&
		closed?.hasMore &&
		!closed.loading &&
		!closed.loadingMore &&
		!closed.error
	);
});
useIntersectionObserver(
	loadMoreSentinel,
	([entry]) => {
		if (entry?.isIntersecting && canAutoLoad.value) emit('loadMore', 'closed');
	},
	{ root: listRef, threshold: 0.01 },
);
const tabs = computed(() => [
	{
		value: 'open',
		label: i18n.baseText('inbox.tabs.open'),
		tag: props.openCount === null ? undefined : String(props.openCount),
	},
	{
		value: 'closed',
		label: i18n.baseText('inbox.tabs.closed'),
		tag: props.closedCount === null ? undefined : String(props.closedCount),
	},
]);
function sectionTitle(key: 'waiting' | 'authored') {
	return key === 'waiting' && usersStore.isAdminOrOwner
		? i18n.baseText('workflowReviews.sidebar.section.waiting.titleAdmin')
		: i18n.baseText(`workflowReviews.sidebar.section.${key}.title`);
}
function onTabChange(value: string | number | boolean) {
	if (value === 'open' || value === 'closed') emit('update:active-tab', value);
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
	<aside :class="$style.sidebar" data-test-id="inbox-list">
		<div :class="$style.title">
			<N8nHeading bold tag="h2" size="xlarge">{{ i18n.baseText('inbox.title') }}</N8nHeading>
			<N8nButton
				v-if="hasLoadedMore"
				size="mini"
				variant="subtle"
				:disabled="refreshing"
				:label="i18n.baseText('generic.refresh')"
				@click="emit('refresh')"
			/>
		</div>
		<N8nTabs
			:model-value="activeTab"
			:options="tabs"
			variant="modern"
			data-test-id="inbox-tabs"
			@update:model-value="onTabChange"
		/>
		<div ref="list" :class="$style.list" @click.self="emit('clear')">
			<div
				v-for="group in groups"
				:key="group.key"
				:class="$style.section"
				:data-section="group.key"
			>
				<button
					v-if="group.key !== 'closed'"
					:id="`inbox-section-header-${group.key}`"
					type="button"
					:class="$style.sectionHeader"
					:aria-expanded="!group.collapsed"
					:aria-controls="`inbox-section-${group.key}`"
					data-test-id="inbox-section-header"
					@click="toggleSection(group.key)"
				>
					<N8nIcon
						icon="chevron-down"
						size="small"
						:class="[$style.chevron, { [$style.chevronCollapsed]: group.collapsed }]"
					/>
					<N8nText bold size="small">{{ sectionTitle(group.key) }}</N8nText>
				</button>
				<div
					:id="`inbox-section-${group.key}`"
					:class="$style.group"
					role="listbox"
					:aria-labelledby="
						group.key !== 'closed' ? `inbox-section-header-${group.key}` : undefined
					"
					:aria-label="group.key === 'closed' ? i18n.baseText('inbox.tabs.closed') : undefined"
				>
					<template v-if="!group.collapsed">
						<N8nLoading
							v-if="group.loading && group.items.length === 0"
							:loading="true"
							:rows="3"
						/>
						<N8nCard
							v-for="item in group.items"
							:key="`${item.type}:${item.id}`"
							:class="[
								$style.card,
								{ [$style.selected]: selectedKey === `${item.type}:${item.id}` },
							]"
							role="option"
							tabindex="0"
							:aria-selected="selectedKey === `${item.type}:${item.id}`"
							:data-source="item.type"
							data-test-id="inbox-row"
							@click="emit('select', item)"
							@keydown.enter.prevent="emit('select', item)"
							@keydown.space.prevent="emit('select', item)"
						>
							<div :class="$style.cardContent">
								<div :class="$style.cardHeader">
									<N8nAssistantAvatar
										v-if="item.type === 'self_healing_result'"
										size="mini"
										:class="$style.assistantAvatar"
										data-test-id="inbox-assistant-avatar"
									/>
									<N8nText bold tag="h3" :class="$style.cardTitle">{{
										item.type === 'workflow_review' ? item.title : item.summary
									}}</N8nText>
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
									<N8nBadge
										v-if="item.workflowName"
										variant="outline"
										:class="$style.workflowBadge"
									>
										<span :class="$style.workflowBadgeText" :title="item.workflowName"
											><N8nIcon icon="workflow" size="small" /><span>{{
												item.workflowName
											}}</span></span
										>
									</N8nBadge>
									<N8nText :class="$style.time" size="xsmall" color="text-light"
										><N8nTimeAgo :date="item.createdAt" :locale="rootStore.defaultLocale"
									/></N8nText>
								</div>
							</div>
						</N8nCard>
					</template>
				</div>
				<template v-if="!group.collapsed">
					<div
						v-if="group.partial"
						:class="$style.notice"
						role="status"
						data-test-id="inbox-partial"
					>
						<N8nText size="small">{{ i18n.baseText('inbox.partial') }}</N8nText>
						<N8nButton
							size="mini"
							variant="subtle"
							:label="i18n.baseText('generic.retry')"
							@click="emit('refreshSection', group.key)"
						/>
					</div>
					<div
						v-if="group.error"
						:class="$style.notice"
						role="alert"
						data-test-id="inbox-list-error"
					>
						<N8nText size="small">{{ i18n.baseText('inbox.loadError') }}</N8nText>
						<N8nButton
							size="mini"
							variant="subtle"
							:label="i18n.baseText('generic.retry')"
							@click="emit('retry', group.key)"
						/>
					</div>
					<N8nButton
						v-if="group.key !== 'closed' && group.hasMore"
						:class="$style.loadMore"
						size="small"
						variant="subtle"
						:loading="group.loadingMore"
						:disabled="group.loading"
						:label="i18n.baseText('inbox.loadMore')"
						data-test-id="inbox-load-more"
						@click="emit('loadMore', group.key)"
					/>
					<N8nLoading
						v-if="group.key === 'closed' && group.loadingMore"
						:loading="true"
						:rows="1"
					/>
				</template>
			</div>
			<div v-if="canAutoLoad" ref="loadMoreSentinel" :class="$style.sentinel" />
		</div>
	</aside>
</template>

<style module lang="scss">
.sidebar {
	display: flex;
	flex-direction: column;
	min-width: 0;
	height: 100%;
	border-right: var(--border);
	padding-right: var(--spacing--md);
}
.title {
	display: flex;
	justify-content: space-between;
	align-items: center;
	min-height: var(--spacing--2xl);
	padding-bottom: var(--spacing--sm);
}
.list {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--sm);
	overflow-y: auto;
	padding-block: var(--spacing--sm);
}
.section,
.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;
	text-align: left;
}
.sectionHeader:hover {
	background-color: var(--background--active);
}
.sectionHeader:focus-visible {
	outline: var(--border-width) solid var(--focus--border-color);
}
.chevron {
	color: var(--color--text--tint-1);
}
.chevronCollapsed {
	transform: rotate(-90deg);
}
.notice {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding-block: var(--spacing--xs);
}
.card {
	cursor: pointer;
	padding: var(--spacing--xs);
	align-items: stretch;
	border: var(--border);
}
.card:hover:not(.selected),
.selected {
	background: var(--background--active);
	border-color: transparent;
}
.card:focus-visible {
	border-color: var(--focus--border-color);
}
.cardContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
	width: 100%;
}
.cardHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-width: 0;
}
.cardTitle {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	font-size: var(--font-size--sm);
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
.time {
	margin-left: auto;
	flex-shrink: 0;
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
.sentinel {
	flex-shrink: 0;
	height: var(--border-width);
}
.loadMore {
	align-self: center;
}
</style>
