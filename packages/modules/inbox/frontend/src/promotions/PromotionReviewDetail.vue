<script setup lang="ts">
import type { PromotionReviewDetail, PromotionReviewState } from '@n8n/api-types';
import {
	N8nAvatar,
	N8nBadge,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nLoading,
	N8nText,
	type BadgeVariant,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref, watch } from 'vue';

import { formatUserDisplayName } from '../reviews/workflowReviews.utils';
import { fetchPromotionReview } from './promotionReviews.api';

const props = defineProps<{ reviewId: string }>();
const i18n = useI18n();
const rootStore = useRootStore();
const review = ref<PromotionReviewDetail | null>(null);
const loadFailed = ref(false);

const stateBadge: Record<PromotionReviewState, BadgeVariant> = {
	open: 'info',
	changes_requested: 'warning',
	merged: 'success',
	closed: 'subtle',
};

watch(
	() => props.reviewId,
	async (reviewId) => {
		review.value = null;
		loadFailed.value = false;
		try {
			const detail = await fetchPromotionReview(rootStore.publicApiContext, reviewId);
			if (reviewId === props.reviewId) review.value = detail;
		} catch {
			if (reviewId === props.reviewId) loadFailed.value = true;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<section :class="$style.detail" data-test-id="inbox-promotion-review-detail">
		<N8nCallout v-if="loadFailed" theme="danger">
			{{ i18n.baseText('inbox.promotionReview.detail.loadError') }}
		</N8nCallout>
		<N8nLoading v-else-if="!review" :rows="3" />
		<template v-else>
			<header :class="$style.header">
				<div :class="$style.titleRow">
					<N8nHeading tag="h2" size="xlarge" bold>
						{{
							review.remote?.title ??
							review.branchName ??
							i18n.baseText('inbox.promotionReview.untitled')
						}}
					</N8nHeading>
					<N8nBadge :variant="stateBadge[review.state]">
						{{ i18n.baseText(`inbox.promotionReview.state.${review.state}`) }}
					</N8nBadge>
					<N8nLink
						v-if="review.remote"
						:class="$style.gitlabLink"
						:to="review.remote.webUrl"
						new-window
					>
						<N8nIcon icon="arrow-up-right" size="small" />
						{{ i18n.baseText('inbox.promotionReview.detail.openInGitLab') }}
					</N8nLink>
				</div>
				<div :class="$style.meta">
					<span v-if="review.config" :class="$style.metaItem">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('inbox.promotionReview.detail.promoteTo') }}
						</N8nText>
						<N8nText size="small" bold>{{ review.config.name }}</N8nText>
					</span>
					<span v-if="review.approvedBy" :class="$style.metaItem">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('inbox.promotionReview.detail.reviewer') }}
						</N8nText>
						<N8nAvatar
							:first-name="review.approvedBy.firstName"
							:last-name="review.approvedBy.lastName"
							size="xsmall"
						/>
						<N8nText size="small">{{ formatUserDisplayName(review.approvedBy) }}</N8nText>
					</span>
					<span v-if="review.createdBy" :class="$style.metaItem">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('inbox.promotionReview.detail.requestedBy') }}
						</N8nText>
						<N8nAvatar
							:first-name="review.createdBy.firstName"
							:last-name="review.createdBy.lastName"
							size="xsmall"
						/>
						<N8nText size="small">{{ formatUserDisplayName(review.createdBy) }}</N8nText>
					</span>
				</div>
			</header>
			<N8nCallout
				v-if="review.remoteError"
				theme="warning"
				data-test-id="inbox-promotion-review-remote-error"
			>
				{{ i18n.baseText(`inbox.promotionReview.detail.remoteError.${review.remoteError}`) }}
			</N8nCallout>
		</template>
	</section>
</template>

<style module lang="scss">
.detail {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
}

.gitlabLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: auto;
	white-space: nowrap;
}

.meta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs) var(--spacing--lg);
}

.metaItem {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
