<script setup lang="ts">
import type { InboxWorkflowReviewItem } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nEmptyState, N8nHeading, N8nLoading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { InboxItemChange } from '../inbox.constants';
import WorkflowReviewDetailTabs from './components/WorkflowReviewDetailTabs.vue';
import type { WorkflowReviewDetailTab } from './components/WorkflowReviewDetailTabs.vue';
import WorkflowReviewStatusDot from './components/WorkflowReviewStatusDot.vue';
import { useReviewActivityStore } from './reviewActivity.store';
import { useReviewDetailStore } from './reviewDetail.store';
import type { WorkflowReviewDecisionInput } from './workflowReviews.api';

const props = withDefaults(
	defineProps<{
		reviewId: string;
		listItem?: InboxWorkflowReviewItem;
		tab?: WorkflowReviewDetailTab;
		onItemChange: (change: InboxItemChange) => void;
	}>(),
	{ tab: 'activity' },
);
const emit = defineEmits<{ 'update:tab': [tab: WorkflowReviewDetailTab] }>();

const reviewStore = useReviewDetailStore();
const activityStore = useReviewActivityStore();
const { detail, detailLoading, detailNotFound } = storeToRefs(reviewStore);

const i18n = useI18n();
const { showError, showMessage } = useToast();

const deciding = ref(false);
const loadFailed = ref(false);
const alertIcon = { type: 'icon', value: 'circle-alert' } as const;

const review = computed(() => {
	if (detail.value?.id === props.reviewId) {
		return detail.value;
	}

	return props.listItem?.id === props.reviewId ? props.listItem : null;
});

let isMounted = false;
let selectionRevision = 0;

function ownsSelection(id: string, revision = selectionRevision) {
	return (
		isMounted &&
		props.reviewId === id &&
		revision === selectionRevision &&
		revision === reviewStore.selectionRevision
	);
}

function handleLoadError(error: unknown, id: string, revision: number) {
	if (!ownsSelection(id, revision)) {
		return;
	}

	loadFailed.value = true;
	showError(error, i18n.baseText('workflowReviews.error.load'));
}

async function loadDetail(id: string, revision: number) {
	try {
		await reviewStore.fetchDetail(id);

		if (ownsSelection(id, revision)) {
			loadFailed.value = false;
		}
	} catch (error) {
		handleLoadError(error, id, revision);
	}
}

watch(
	() => props.reviewId,
	(id) => {
		// A new entry owns these stores. An older layout must not reset them on unmount.
		reviewStore.clearDetail();
		activityStore.reset();

		selectionRevision = reviewStore.selectionRevision;
		const revision = selectionRevision;
		deciding.value = false;
		loadFailed.value = false;

		void loadDetail(id, revision);
		void activityStore.fetchFeed(id);
	},
	{ immediate: true },
);

watch(detailNotFound, (notFound) => {
	if (!notFound || !ownsSelection(props.reviewId)) {
		return;
	}

	activityStore.reset();
	props.onItemChange({ type: 'workflow_review', id: props.reviewId, unavailable: true });
});

function asSentence(message: string) {
	const trimmed = message.trim();
	return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

async function onDecide(input: WorkflowReviewDecisionInput) {
	const id = props.reviewId;
	const revision = selectionRevision;

	if (!ownsSelection(id, revision) || deciding.value) {
		return;
	}

	// The Inbox can reconcile this result after the viewer selects another source.
	const onItemChange = props.onItemChange;
	deciding.value = true;

	try {
		const { autoPublish, state, decision, updatedAt } = await reviewStore.decideOnReview(id, input);
		onItemChange({ type: 'workflow_review', id, state, decision, updatedAt });

		if (!ownsSelection(id, revision)) {
			return;
		}

		activityStore.clearDecisionNote(input.note ?? '');
		void activityStore.fetchFeed(id);

		if (state === 'closed') {
			void loadDetail(id, revision);
		}

		if (autoPublish?.status === 'published') {
			showMessage({
				type: 'success',
				title: i18n.baseText('workflowReviews.decision.approved.published.title'),
				message: i18n.baseText('workflowReviews.decision.approved.published.message'),
			});
		} else if (autoPublish?.status === 'failed') {
			showMessage({
				type: 'warning',
				duration: 0,
				title: i18n.baseText('workflowReviews.decision.approved.publishFailed.title'),
				message: i18n.baseText('workflowReviews.decision.approved.publishFailed.message', {
					interpolate: { message: asSentence(autoPublish.message) },
				}),
			});
		}
	} catch (error) {
		onItemChange({ type: 'workflow_review', id });

		if (!ownsSelection(id, revision)) {
			return;
		}

		showError(error, i18n.baseText('workflowReviews.decision.error.title'));

		// Another reviewer can decide first. Keep the note while loading the current result.
		await Promise.all([loadDetail(id, revision), activityStore.fetchFeed(id)]);
	} finally {
		if (ownsSelection(id, revision)) {
			deciding.value = false;
		}
	}
}

onMounted(() => {
	isMounted = true;
});

onBeforeUnmount(() => {
	isMounted = false;
});
</script>

<template>
	<section :class="$style.detail" data-test-id="workflow-review-detail">
		<div :class="$style.columnTitle">
			<div
				v-if="review && !detailNotFound"
				:class="$style.reviewTitle"
				data-test-id="workflow-review-request-title-row"
			>
				<WorkflowReviewStatusDot :state="review.state" :decision="review.decision" />
				<N8nHeading bold tag="h2" size="xlarge" data-test-id="workflow-review-request-title">{{
					review.title
				}}</N8nHeading>
			</div>
		</div>
		<div :class="$style.mainBody">
			<div
				v-if="detailNotFound"
				:class="$style.emptyStateWrapper"
				data-test-id="workflow-review-detail-not-found"
			>
				<N8nEmptyState
					:class="$style.emptyState"
					:icon="alertIcon"
					:heading="i18n.baseText('workflowReviews.detail.notFound.title')"
					:description="i18n.baseText('workflowReviews.detail.notFound.body')"
				/>
			</div>
			<div v-else-if="detailLoading" :class="$style.detailSkeleton">
				<N8nLoading :loading="true" :rows="3" />
			</div>
			<WorkflowReviewDetailTabs
				v-else-if="review"
				:review="review"
				:tab="tab"
				:deciding="deciding"
				@update:tab="emit('update:tab', $event)"
				@decide="onDecide"
			/>
			<div
				v-else-if="loadFailed"
				:class="$style.emptyStateWrapper"
				data-test-id="workflow-review-detail-load-error"
			>
				<N8nEmptyState
					:class="$style.emptyState"
					:icon="alertIcon"
					:heading="i18n.baseText('workflowReviews.error.load')"
					:button-text="i18n.baseText('generic.retry')"
					@click:button="loadDetail(reviewId, selectionRevision)"
				/>
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
.detail {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
}

.columnTitle {
	display: flex;
	align-items: center;
	min-height: var(--spacing--2xl);
	padding-bottom: var(--spacing--sm);
}

.reviewTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.mainBody {
	flex: 1;
	min-height: 0;
	overflow: auto;
}

.detailSkeleton {
	max-width: var(--review-activity--max-width);
}

.emptyStateWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
}

.emptyStateWrapper .emptyState {
	border: none;
	padding: 0;
}
</style>
