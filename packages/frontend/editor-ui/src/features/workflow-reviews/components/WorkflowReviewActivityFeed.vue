<script setup lang="ts">
import { N8nButton, N8nEmptyState, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { onMounted, ref, watch } from 'vue';

import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';

import { useReviewActivityStore } from '../reviewActivity.store';
import { resolveActivityComponent } from './activityEntryRegistry';

const i18n = useI18n();
const store = useReviewActivityStore();
const { entries, loading, loadingMore, hasMore, error } = storeToRefs(store);

const scrollContainer = ref<HTMLElement | null>(null);
const list = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);
// Held back until the initial scroll position is applied, so the sentinel cannot
// intersect at scrollTop 0 and pull in the whole feed before the user sees it.
const initialScrollApplied = ref(false);

let prependAnchor: { element: Element; top: number } | null = null;

function scrollToBottom() {
	const container = scrollContainer.value;
	if (container) container.scrollTop = container.scrollHeight;
}

const { observe } = useIntersectionObserver({
	root: scrollContainer,
	threshold: 0.01,
	onIntersect: () => {
		// Captured here, not in the post-flush watcher: by then the older page is
		// already in the DOM and the difference would be zero.
		const element = list.value?.firstElementChild ?? null;
		prependAnchor = element ? { element, top: element.getBoundingClientRect().top } : null;
		void store.loadMore();
	},
});

watch(
	[sentinel, hasMore, loadingMore, () => entries.value.length],
	([sentinelElement, moreToLoad, isLoadingMore]) => {
		if (sentinelElement && moreToLoad && !isLoadingMore) {
			observe(sentinelElement);
		}
	},
	{ immediate: true, flush: 'post' },
);

watch(
	entries,
	(next, previous) => {
		if (next.length === 0) return;
		if (!previous || previous.length === 0) {
			scrollToBottom();
			return;
		}
		if (next[0]?.id !== previous[0]?.id) {
			const container = scrollContainer.value;
			if (container && prependAnchor) {
				container.scrollTop +=
					prependAnchor.element.getBoundingClientRect().top - prependAnchor.top;
			}
			prependAnchor = null;
			return;
		}
		if (next.at(-1)?.id !== previous.at(-1)?.id) scrollToBottom();
	},
	{ flush: 'post' },
);

// `loadMore` is a no-op with no cursor, so a failed first page has to refetch.
function retryInitialLoad() {
	if (store.currentReviewId) void store.fetchFeed(store.currentReviewId);
}

// Entries may already be loaded on mount (Changes -> Activity round trip).
onMounted(() => {
	if (entries.value.length > 0) scrollToBottom();
	initialScrollApplied.value = true;
});
</script>

<template>
	<div ref="scrollContainer" :class="$style.feed" data-test-id="workflow-review-activity-feed">
		<N8nLoading v-if="loading && entries.length === 0" :loading="true" :rows="3" />
		<div
			v-else-if="error && entries.length === 0"
			:class="$style.errorRow"
			data-test-id="workflow-review-activity-error"
		>
			<N8nText color="text-light" size="small">
				{{ i18n.baseText('workflowReviews.detail.activity.error.load') }}
			</N8nText>
			<N8nButton
				size="mini"
				variant="ghost"
				data-test-id="workflow-review-activity-retry"
				@click="retryInitialLoad()"
			>
				{{ i18n.baseText('generic.retry') }}
			</N8nButton>
		</div>
		<div v-else-if="entries.length === 0" data-test-id="workflow-review-activity-empty">
			<N8nEmptyState
				:heading="i18n.baseText('workflowReviews.detail.activity.empty.heading')"
				:description="i18n.baseText('workflowReviews.detail.activity.empty.description')"
			/>
		</div>
		<template v-else>
			<div
				v-if="initialScrollApplied && hasMore && !error"
				ref="sentinel"
				:class="$style.sentinel"
				data-test-id="workflow-review-activity-load-more-sentinel"
			/>
			<N8nLoading v-if="loadingMore" :loading="true" :rows="1" />
			<div v-if="error" :class="$style.errorRow">
				<N8nText color="text-light" size="small">
					{{ i18n.baseText('workflowReviews.detail.activity.error.load') }}
				</N8nText>
				<N8nButton
					size="mini"
					variant="ghost"
					data-test-id="workflow-review-activity-load-more-retry"
					@click="store.loadMore()"
				>
					{{ i18n.baseText('generic.retry') }}
				</N8nButton>
			</div>
			<div
				ref="list"
				role="list"
				:aria-label="i18n.baseText('workflowReviews.detail.activity.listLabel')"
				:class="$style.list"
			>
				<div
					v-for="entry in entries"
					:key="entry.id"
					role="listitem"
					data-test-id="workflow-review-activity-entry"
				>
					<component :is="resolveActivityComponent(entry)" :entry="entry" />
				</div>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.feed {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	overflow: auto;
	padding-block: var(--spacing--2xs) var(--spacing--sm);
}

/* The detail body stacks and takes over scrolling here, so the feed must bound itself or its
	load-older sentinel never leaves the screen and drains every page. */
@media (max-width: 60rem) {
	.feed {
		max-height: 60vh;
	}
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.errorRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-bottom: var(--spacing--xs);
}

.sentinel {
	height: var(--spacing--4xs);
	flex-shrink: 0;
}
</style>
