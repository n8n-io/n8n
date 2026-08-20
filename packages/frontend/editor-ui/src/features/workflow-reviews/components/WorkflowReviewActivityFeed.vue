<script setup lang="ts">
import { N8nButton, N8nLoading, N8nText } from '@n8n/design-system';
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
		// Good for this update only, and only while its element is still in the list: `loadMore`
		// bails out on a cursor it has already spent, leaving an anchor behind, and a refetch
		// drops the entries an older anchor points at.
		const anchor = prependAnchor?.element.isConnected === true ? prependAnchor : null;
		prependAnchor = null;

		if (next.length === 0) return;
		if (!previous || previous.length === 0) {
			scrollToBottom();
			return;
		}
		if (next[0]?.id !== previous[0]?.id) {
			const container = scrollContainer.value;
			// With no anchor the list was replaced rather than prepended to — a refetch keeps
			// only what is newer than the page it got — so the newest entry is what to show.
			if (!container || !anchor) {
				scrollToBottom();
				return;
			}
			container.scrollTop += anchor.element.getBoundingClientRect().top - anchor.top;
			return;
		}
		if (next.at(-1)?.id !== previous.at(-1)?.id) scrollToBottom();
	},
	{ flush: 'post' },
);

// `loadMore` is a no-op with no cursor, so a failed first page has to refetch. Shared by both
// error rows: posting onto a failed feed moves the viewer from the first to the second, which
// would otherwise hit that dead end and leave the earlier activity unreachable.
function retry() {
	if (!store.nextCursor) {
		if (store.currentReviewId) void store.fetchFeed(store.currentReviewId);
		return;
	}
	void store.loadMore();
}

// Entries may already be loaded on mount (Changes -> Activity round trip).
onMounted(() => {
	if (entries.value.length > 0) scrollToBottom();
	initialScrollApplied.value = true;
});
</script>

<template>
	<div ref="scrollContainer" :class="$style.feed" data-test-id="workflow-review-activity-feed">
		<div v-if="$slots.header" :class="$style.header">
			<slot name="header" />
		</div>
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
				@click="retry()"
			>
				{{ i18n.baseText('generic.retry') }}
			</N8nButton>
		</div>
		<template v-else>
			<div
				v-if="initialScrollApplied && hasMore && !error"
				ref="sentinel"
				:class="$style.sentinel"
				data-test-id="workflow-review-activity-load-more-sentinel"
			/>
			<!-- `loading` too: a retry that keeps a posted comment on screen leaves this the
				only place a refetch can show progress. -->
			<N8nLoading v-if="loadingMore || loading" :loading="true" :rows="1" />
			<div v-if="error" :class="$style.errorRow">
				<N8nText color="text-light" size="small">
					{{ i18n.baseText('workflowReviews.detail.activity.error.load') }}
				</N8nText>
				<N8nButton
					size="mini"
					variant="ghost"
					data-test-id="workflow-review-activity-load-more-retry"
					@click="retry()"
				>
					{{ i18n.baseText('generic.retry') }}
				</N8nButton>
			</div>
			<N8nText bold color="text-light" size="medium" :class="$style.header">{{
				i18n.baseText('workflowReviews.detail.tabs.activity')
			}}</N8nText>
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
					:class="$style.item"
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
	padding-block: var(--spacing--5xs) var(--spacing--sm);
	/* Keeps the cards off the scrollbar that appears here when feed overflows */
	padding-inline-end: var(--spacing--2xs);
}

/* The detail body stacks and takes over scrolling here, so the feed must bound itself or its
	load-older sentinel never leaves the screen and drains every page. */
@container review-detail (max-width: 44rem) {
	.feed {
		max-height: 60vh;
	}
}

/* Same inset the list gives its entries, so a card here starts on the avatar column. */
.header {
	padding-inline: var(--spacing--sm);
	padding-bottom: var(--spacing--sm);
}

.list {
	/* The rail below spans this gap, so both read it from here. */
	--review-activity--gap: var(--spacing--md);
	/* Every entry leads with an `xxsmall` avatar (`N8nAvatar/avatarSizes.ts`), and a boxed
		entry's negative margin and padding cancel out, so all avatars share this column. The
		rail below is centred on it. */
	--review-activity--avatar-size: 16px;
	--review-activity--line-height: 20px;

	display: flex;
	flex-direction: column;
	gap: var(--review-activity--gap);
	/* Entries sit inset; a boxed entry cancels this to reach the panel edge. */
	padding-inline: var(--spacing--sm);
}

.item {
	position: relative;
}

/* Threads the entries into one timeline. Drawn in the gap above each entry rather than
	inside it, because the line belongs to the space between two entries and only the list
	knows that gap. The first entry has nothing above it to join. */
.item:not(:first-child)::before {
	content: '';
	position: absolute;
	/* Floats clear of both neighbours instead of butting into them, as the design does. The
		row is taller than its avatar, so the same inset reads as a wider gap at the top. */
	bottom: calc(100% + var(--spacing--5xs));
	height: calc(var(--review-activity--gap) - 2 * var(--spacing--5xs));
	left: calc(var(--review-activity--avatar-size) / 2);
	border-left: var(--border);
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
