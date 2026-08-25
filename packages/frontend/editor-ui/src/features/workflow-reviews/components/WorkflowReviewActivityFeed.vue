<script setup lang="ts">
import { N8nButton, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { computed, inject, ref, watch } from 'vue';

import { useIntersectionObserver } from '@/app/composables/useIntersectionObserver';

import { ReviewDetailScrollContainerKey } from '../constants';
import { useReviewActivityStore } from '../reviewActivity.store';
import { resolveActivityComponent } from './activityEntryRegistry';

const i18n = useI18n();
const store = useReviewActivityStore();
const { entries, loading, loadingMore, hasMore, posting, error } = storeToRefs(store);

const feed = ref<HTMLElement | null>(null);
const providedScrollContainer = inject(ReviewDetailScrollContainerKey, null);
const scrollContainer = computed(() =>
	providedScrollContainer ? providedScrollContainer.value : feed.value,
);
const list = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);
const enteringCommentId = ref<string | null>(null);
// Held back until the initial scroll position is applied, so the sentinel cannot
// intersect at scrollTop 0 and pull in the whole feed before the user sees it.
const initialScrollApplied = ref(false);

let prependAnchor: { element: Element; top: number } | null = null;

// `postComment` appends while `posting` is still true. Capture that synchronous
// mutation before the promise's `finally` clears the flag; older-page prepends,
// initial fetches, and server refetches must not replay this feedback animation.
watch(
	entries,
	(next, previous) => {
		if (next.length === 0) {
			enteringCommentId.value = null;
			return;
		}
		if (!posting.value) return;

		const newest = next.at(-1);
		if (newest?.type === 'comment.created' && !previous?.some((entry) => entry.id === newest.id)) {
			enteringCommentId.value = newest.id;
		}
	},
	{ flush: 'sync' },
);

function onCommentEntryAnimationEnd(entryId: string) {
	if (enteringCommentId.value === entryId) enteringCommentId.value = null;
}

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
	[scrollContainer, sentinel, hasMore, loadingMore, () => entries.value.length],
	([container, sentinelElement, moreToLoad, isLoadingMore]) => {
		if (container && sentinelElement && moreToLoad && !isLoadingMore) {
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

// Entries may already be loaded when the scroll root becomes available (including
// a Changes -> Activity round trip). The parent-owned root arrives after the child
// first renders, so key this to the element instead of the component mount.
watch(
	scrollContainer,
	(container) => {
		if (!container || initialScrollApplied.value) return;
		if (entries.value.length > 0) scrollToBottom();
		initialScrollApplied.value = true;
	},
	{ immediate: true, flush: 'post' },
);
</script>

<template>
	<div ref="feed" :class="$style.feed" data-test-id="workflow-review-activity-feed">
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
					:class="[$style.item, { [$style.itemEntering]: entry.id === enteringCommentId }]"
					:data-entering="entry.id === enteringCommentId || undefined"
					data-test-id="workflow-review-activity-entry"
					@animationend.self="onCommentEntryAnimationEnd(entry.id)"
				>
					<component :is="resolveActivityComponent(entry)" :entry="entry" />
				</div>
				<div v-if="$slots.footer" role="listitem" :class="$style.item">
					<slot name="footer" />
				</div>
				<!-- The composer lives on the timeline itself, threaded in by the same rail
					as the entries above it, and scrolls with them. -->
				<div v-if="$slots.composer" role="listitem" :class="$style.item">
					<slot name="composer" />
				</div>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.feed {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	overflow: visible;
	padding-block: var(--spacing--5xs) var(--spacing--sm);
	/* Keeps cards clear of the shared detail-body scrollbar. */
	padding-inline-end: var(--spacing--2xs);
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

/* A locally posted comment sharpens quickly, then finishes a gentle upward settle.
	The longer movement keeps the blur from visually swallowing the spatial cue. */
.itemEntering {
	--animation--fade-in-up--duration: var(--animation--duration);
	--animation--fade-in-up--easing: var(--easing--ease-out-quint);
	--animation--fade-in-up--translate: var(--spacing--2xs);

	@include motion.fade-in-up;

	> * {
		animation: review-comment-sharpen var(--animation--duration--snappy)
			var(--easing--ease-out-quint);
	}
}

@keyframes review-comment-sharpen {
	from {
		filter: blur(var(--animation--blur-swap--blur, 4px));
	}
	to {
		filter: none;
	}
}

@media (prefers-reduced-motion: reduce) {
	.itemEntering > * {
		animation: none;
	}
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
