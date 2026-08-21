<script lang="ts" setup>
import type { WorkflowReviewInboxItem, WorkflowReviewRequestState } from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nLoading,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import { useUsersStore } from '@n8n/stores/users.store';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';
import TimeAgo from '@/app/components/TimeAgo.vue';
import WorkflowReviewStatusDot from './WorkflowReviewStatusDot.vue';
import {
	useReviewInboxSectionCollapse,
	type CollapsibleReviewInboxSection,
} from '../composables/useReviewInboxSectionCollapse';
import type { ReviewInboxSectionKey } from '../reviewInbox.store';

/** One independently paginated list, flattened from its store slice. */
export type ReviewInboxSidebarSection = {
	key: ReviewInboxSectionKey;
	items: WorkflowReviewInboxItem[];
	loading: boolean;
	loadingMore: boolean;
	hasMore: boolean;
	error: Error | null;
};

const props = defineProps<{
	sections: ReviewInboxSidebarSection[];
	activeTab: WorkflowReviewRequestState;
	openCount: number;
	closedCount: number;
	selectedId: string | null;
}>();

const emit = defineEmits<{
	select: [id: string];
	clear: [];
	'update:activeTab': [tab: WorkflowReviewRequestState];
	loadMore: [section: ReviewInboxSectionKey];
	retry: [section: ReviewInboxSectionKey];
}>();

const i18n = useI18n();
const usersStore = useUsersStore();
const { isCollapsed, toggleSection } = useReviewInboxSectionCollapse();

/**
 * Admins see every review, including ones nobody assigned them, so "Waiting for
 * your review" would wrongly claim they are blocking.
 */
const usesImpersonalWaitingLabels = computed(() => usersStore.isAdminOrOwner);

function sectionTitle(key: CollapsibleReviewInboxSection): string {
	return key === 'waiting' && usesImpersonalWaitingLabels.value
		? i18n.baseText('workflowReviews.sidebar.section.waiting.titleAdmin')
		: i18n.baseText(`workflowReviews.sidebar.section.${key}.title`);
}

function sectionEmptyText(key: CollapsibleReviewInboxSection): string {
	return key === 'waiting' && usesImpersonalWaitingLabels.value
		? i18n.baseText('workflowReviews.sidebar.section.waiting.emptyAdmin')
		: i18n.baseText(`workflowReviews.sidebar.section.${key}.empty`);
}
const listRef = ref<HTMLElement | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);

const tabOptions = computed(() => [
	{
		label: i18n.baseText('workflowReviews.sidebar.tabs.open'),
		value: 'open' as const,
		tag: String(props.openCount),
	},
	{
		label: i18n.baseText('workflowReviews.sidebar.tabs.closed'),
		value: 'closed' as const,
		tag: String(props.closedCount),
	},
]);

function isCollapsibleSection(key: ReviewInboxSectionKey): key is CollapsibleReviewInboxSection {
	return key !== 'closed';
}

const groups = computed(() =>
	props.sections.map((section) => {
		const collapsibleKey = isCollapsibleSection(section.key) ? section.key : null;
		return {
			key: section.key,
			section,
			collapsible: collapsibleKey !== null,
			title: collapsibleKey ? sectionTitle(collapsibleKey) : null,
			emptyText: collapsibleKey
				? sectionEmptyText(collapsibleKey)
				: i18n.baseText('workflowReviews.sidebar.empty.closed'),
			collapsed: collapsibleKey !== null && isCollapsed(collapsibleKey),
			headerId: `workflow-review-section-header-${section.key}`,
			groupId: `workflow-review-section-group-${section.key}`,
			isEmpty: !section.loading && section.error === null && section.items.length === 0,
		};
	}),
);

/** The closed tab keeps infinite scroll; the open tab loads more explicitly. */
const closedSentinelActive = computed(
	() => props.sections.length === 1 && props.sections[0].key === 'closed',
);

const { observe: observeForLoadMore } = useIntersectionObserver({
	root: listRef,
	threshold: 0.01,
	onIntersect: () => emit('loadMore', 'closed'),
});

watch(
	[
		loadMoreSentinel,
		closedSentinelActive,
		() => props.sections[0]?.hasMore,
		() => props.sections[0]?.loadingMore,
		() => props.sections[0]?.items.length,
	],
	([sentinel, sentinelActive, hasMore, loadingMore]) => {
		if (sentinel && sentinelActive && hasMore && !loadingMore) {
			observeForLoadMore(sentinel);
		}
	},
	{ immediate: true, flush: 'post' },
);

function onTabChange(value: string | number | boolean) {
	emit('update:activeTab', String(value) as WorkflowReviewRequestState);
}

function onSectionHeaderClick(key: ReviewInboxSectionKey) {
	if (isCollapsibleSection(key)) toggleSection(key);
}

function onListBackgroundClick() {
	if (props.selectedId) {
		emit('clear');
	}
}
</script>

<template>
	<aside :class="$style.sidebar" data-test-id="workflow-reviews-sidebar">
		<div :class="$style.columnTitle">
			<N8nHeading bold tag="h2" size="xlarge" data-test-id="workflow-reviews-page-title">
				{{ i18n.baseText('workflowReviews.page.title') }}
			</N8nHeading>
		</div>
		<div :class="$style.header">
			<N8nTabs
				:model-value="activeTab"
				:options="tabOptions"
				variant="modern"
				data-test-id="workflow-reviews-tabs"
				@update:model-value="onTabChange"
			/>
		</div>

		<div ref="listRef" :class="$style.list" @click.self="onListBackgroundClick">
			<div v-for="group in groups" :key="group.key" :class="$style.section">
				<button
					v-if="group.title"
					:id="group.headerId"
					type="button"
					:class="$style.sectionHeader"
					:aria-expanded="!group.collapsed"
					:aria-controls="group.groupId"
					:data-section="group.key"
					data-test-id="workflow-review-section-header"
					@click="onSectionHeaderClick(group.key)"
				>
					<N8nIcon
						icon="chevron-down"
						size="small"
						:class="[$style.chevron, { [$style.chevronCollapsed]: group.collapsed }]"
					/>
					<N8nText bold size="small" color="text-base">{{ group.title }}</N8nText>
				</button>

				<div
					:id="group.groupId"
					role="listbox"
					:class="$style.group"
					:aria-labelledby="group.title ? group.headerId : undefined"
					:aria-label="
						group.title ? undefined : i18n.baseText('workflowReviews.sidebar.tabs.closed')
					"
				>
					<template v-if="!group.collapsed">
						<N8nCard
							v-for="item in group.section.items"
							:key="item.id"
							:class="[$style.card, { [$style.cardSelected]: selectedId === item.id }]"
							data-test-id="workflow-review-request-row"
							role="option"
							tabindex="0"
							:aria-selected="selectedId === item.id"
							@click="emit('select', item.id)"
							@keydown.enter.prevent="emit('select', item.id)"
							@keydown.space.prevent="emit('select', item.id)"
						>
							<div :class="$style.cardContent">
								<div :class="$style.cardHeader">
									<N8nText bold tag="h3" :class="$style.cardTitle">
										{{ item.title }}
									</N8nText>
									<WorkflowReviewStatusDot :state="item.state" :decision="item.decision" />
								</div>
								<div :class="$style.cardMeta">
									<N8nBadge
										v-if="item.workflowName"
										theme="tertiary"
										:show-border="false"
										:class="$style.workflowBadge"
										data-test-id="workflow-review-request-workflow-badge"
									>
										<span :class="$style.workflowBadgeText" :title="item.workflowName">
											<N8nIcon icon="workflow" size="small" />
											<span>{{ item.workflowName }}</span>
										</span>
									</N8nBadge>
									<div :class="$style.cardMetaActions">
										<N8nText
											size="xsmall"
											color="text-light"
											:class="$style.cardMetaTime"
											data-test-id="workflow-review-request-created-at"
										>
											<TimeAgo :date="item.createdAt" />
										</N8nText>
									</div>
								</div>
							</div>
						</N8nCard>
					</template>
				</div>

				<template v-if="!group.collapsed">
					<N8nLoading
						v-if="group.section.loading"
						:loading="true"
						:rows="3"
						:data-section="group.key"
						data-test-id="workflow-review-section-skeleton"
					/>
					<N8nText
						v-else-if="group.isEmpty"
						color="text-light"
						size="small"
						:data-section="group.key"
						data-test-id="workflow-review-section-empty"
					>
						{{ group.emptyText }}
					</N8nText>
					<div v-if="group.section.loadingMore" :class="$style.loadingMore">
						<N8nLoading :loading="true" :rows="1" />
					</div>
					<div
						v-if="group.section.error"
						:class="$style.sectionError"
						:data-section="group.key"
						data-test-id="workflow-review-section-error"
					>
						<N8nText color="danger" size="small">
							{{ i18n.baseText('workflowReviews.sidebar.error') }}
						</N8nText>
						<N8nButton
							variant="subtle"
							size="mini"
							:label="i18n.baseText('workflowReviews.sidebar.retry')"
							:data-section="group.key"
							data-test-id="workflow-review-section-retry"
							@click="emit('retry', group.key)"
						/>
					</div>
					<N8nButton
						v-if="group.collapsible && group.section.hasMore"
						variant="subtle"
						size="small"
						:class="$style.loadMoreButton"
						:label="i18n.baseText('workflowReviews.sidebar.loadMore')"
						:loading="group.section.loadingMore"
						:data-section="group.key"
						data-test-id="workflow-review-section-load-more"
						@click="emit('loadMore', group.key)"
					/>
				</template>
			</div>

			<!-- Outside the v-for: a ref inside one would resolve to an array. -->
			<div v-if="closedSentinelActive" ref="loadMoreSentinel" :class="$style.sentinel" />
		</div>
	</aside>
</template>

<style lang="scss" module>
.sidebar {
	--review-sidebar--width: clamp(15rem, 25vw, 25rem);

	display: flex;
	flex-direction: column;
	flex: 0 0 var(--review-sidebar--width);
	min-width: 0;
	max-width: var(--review-sidebar--width);
	height: 100%;
	border-right: var(--border-width) solid var(--border-color);
}

.columnTitle {
	display: flex;
	align-items: center;
	min-height: var(--spacing--2xl);
	padding: 0 var(--spacing--md) var(--spacing--sm) 0;
}

.header {
	display: flex;
	align-items: center;
	height: var(--review-tab-bar--height, var(--height--sm));
	padding-right: var(--spacing--md);
	margin-bottom: var(--review-tab-bar--gap, calc(var(--spacing--sm) + 11px));
}

.list {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
	overflow-y: auto;
	padding: 0 var(--spacing--md) var(--spacing--md) 0;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
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

	&:hover {
		background-color: var(--background--active);
	}

	&:focus-visible {
		outline: var(--border-width) solid var(--focus--border-color);
	}
}

.chevron {
	transition: transform 0.2s ease;
	color: var(--color--text--tint-1);
}

.chevronCollapsed {
	transform: rotate(-90deg);
}

.sectionError {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
}

.card {
	cursor: pointer;
	padding: var(--spacing--xs);
	align-items: stretch;
	border: var(--border-width) solid var(--border-color);
	transition: background-color 0.3s ease;

	&:hover:not(.cardSelected) {
		background-color: var(--background--active);
		border-color: transparent;
	}

	&:focus-visible {
		border-color: var(--focus--border-color);
	}
}

.cardSelected {
	background-color: var(--background--active);
	border-color: transparent;
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

.cardMeta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: 100%;
	min-width: 0;
}

.cardMetaActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	margin-left: auto;
	flex-shrink: 0;
}

.cardMetaTime {
	white-space: nowrap;
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

.loadMoreButton {
	align-self: center;
}

.loadingMore {
	padding: var(--spacing--sm);
}

.sentinel {
	height: var(--border-width);
}
</style>
