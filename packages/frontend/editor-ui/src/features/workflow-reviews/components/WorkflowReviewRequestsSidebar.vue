<script lang="ts" setup>
import type { WorkflowReviewInboxItem, WorkflowReviewRequestState } from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nBadge,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nLoading,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';
import TimeAgo from '@/app/components/TimeAgo.vue';

const props = defineProps<{
	items: WorkflowReviewInboxItem[];
	activeState: WorkflowReviewRequestState;
	selectedId: string | null;
	loading: boolean;
	loadingMore: boolean;
	hasMore: boolean;
	isEmpty: boolean;
}>();

const emit = defineEmits<{
	select: [id: string];
	clear: [];
	'update:activeState': [state: WorkflowReviewRequestState];
	loadMore: [];
}>();

const i18n = useI18n();
const listRef = ref<HTMLElement | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);

const tabOptions = computed(() => [
	{ label: i18n.baseText('workflowReviews.sidebar.tabs.open'), value: 'open' as const },
	{ label: i18n.baseText('workflowReviews.sidebar.tabs.closed'), value: 'closed' as const },
]);

const { observe: observeForLoadMore } = useIntersectionObserver({
	root: listRef,
	threshold: 0.01,
	onIntersect: () => emit('loadMore'),
});

watch(
	[loadMoreSentinel, () => props.hasMore, () => props.loadingMore, () => props.items.length],
	([sentinel, hasMore, loadingMore]) => {
		if (sentinel && hasMore && !loadingMore) {
			observeForLoadMore(sentinel);
		}
	},
	{ immediate: true, flush: 'post' },
);

function onTabChange(value: string | number | boolean) {
	emit('update:activeState', String(value) as WorkflowReviewRequestState);
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
				:model-value="activeState"
				:options="tabOptions"
				variant="modern"
				data-test-id="workflow-reviews-tabs"
				@update:model-value="onTabChange"
			/>
		</div>

		<div
			ref="listRef"
			role="listbox"
			:aria-label="i18n.baseText('workflowReviews.page.title')"
			:class="$style.list"
			@click.self="onListBackgroundClick"
		>
			<N8nLoading v-if="loading" :loading="true" :rows="4" />
			<template v-else>
				<N8nText
					v-if="isEmpty"
					color="text-light"
					size="small"
					data-test-id="workflow-reviews-empty"
				>
					{{ i18n.baseText('workflowReviews.sidebar.empty') }}
				</N8nText>
				<N8nCard
					v-for="item in items"
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
						<N8nText bold tag="h3" :class="$style.cardTitle">
							{{ item.title }}
						</N8nText>
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
				</N8nCard>
				<div v-if="loadingMore" :class="$style.loadingMore">
					<N8nLoading :loading="true" :rows="1" />
				</div>
				<div ref="loadMoreSentinel" :class="$style.sentinel" />
			</template>
		</div>
	</aside>
</template>

<style lang="scss" module>
.sidebar {
	display: flex;
	flex-direction: column;
	flex: 0 0 35%;
	min-width: 12rem;
	height: 100%;
	border-right: var(--border-width) solid var(--color--foreground--tint-1);
}

.columnTitle {
	display: flex;
	align-items: center;
	min-height: var(--spacing--2xl);
	padding: 0 var(--spacing--md) var(--spacing--sm) 0;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0 var(--spacing--md) var(--spacing--md) 0;
}

.list {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--2xs);
	overflow-y: auto;
	padding: 0 var(--spacing--md) var(--spacing--md) 0;
}

.card {
	cursor: pointer;
	padding: var(--spacing--xs);
	align-items: stretch;
	border: var(--border-width) solid var(--color--foreground--tint-1);
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

.cardTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	width: 100%;
	font-size: var(--font-size--sm);
}

.cardMeta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
	min-width: 0;
}

.cardMetaTime {
	flex-shrink: 0;
	white-space: nowrap;
	margin-left: auto;
}

.workflowBadge {
	flex: 0 1 auto;
	max-width: 100%;
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	color: var(--color--text);
	max-width: 12rem;

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
	line-height: calc(var(--font-size--sm) + 1px);

	> span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}
}

.loadingMore {
	padding: var(--spacing--sm);
}

.sentinel {
	height: 1px;
}
</style>
