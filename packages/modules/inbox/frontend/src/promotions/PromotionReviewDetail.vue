<script setup lang="ts">
import type { InboxPromotionReviewItem, PromotionReviewState } from '@n8n/api-types';
import {
	N8nAvatar,
	N8nBadge,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nText,
	type BadgeVariant,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { formatUserDisplayName } from '../reviews/workflowReviews.utils';

defineProps<{ item: InboxPromotionReviewItem }>();
const i18n = useI18n();

const stateBadge: Record<PromotionReviewState, BadgeVariant> = {
	open: 'info',
	changes_requested: 'warning',
	merged: 'success',
	closed: 'subtle',
};
</script>

<template>
	<section :class="$style.detail" data-test-id="inbox-promotion-review-detail">
		<header :class="$style.header">
			<div :class="$style.titleRow">
				<N8nHeading tag="h2" size="xlarge" bold>
					{{ item.title ?? item.branchName ?? i18n.baseText('inbox.promotionReview.untitled') }}
				</N8nHeading>
				<N8nBadge :variant="stateBadge[item.reviewState]">
					{{ i18n.baseText(`inbox.promotionReview.state.${item.reviewState}`) }}
				</N8nBadge>
				<N8nLink v-if="item.webUrl" :class="$style.gitlabLink" :to="item.webUrl" new-window>
					<N8nIcon icon="arrow-up-right" size="small" />
					{{ i18n.baseText('inbox.promotionReview.detail.openInGitLab') }}
				</N8nLink>
			</div>
			<div :class="$style.meta">
				<span v-if="item.environmentName" :class="$style.metaItem">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('inbox.promotionReview.detail.promoteTo') }}
					</N8nText>
					<N8nText size="small" bold>{{ item.environmentName }}</N8nText>
				</span>
				<span v-if="item.approver" :class="$style.metaItem">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('inbox.promotionReview.detail.reviewer') }}
					</N8nText>
					<N8nAvatar
						:first-name="item.approver.firstName"
						:last-name="item.approver.lastName"
						size="xsmall"
					/>
					<N8nText size="small">{{ formatUserDisplayName(item.approver) }}</N8nText>
				</span>
				<span v-if="item.requester" :class="$style.metaItem">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('inbox.promotionReview.detail.requestedBy') }}
					</N8nText>
					<N8nAvatar
						:first-name="item.requester.firstName"
						:last-name="item.requester.lastName"
						size="xsmall"
					/>
					<N8nText size="small">{{ formatUserDisplayName(item.requester) }}</N8nText>
				</span>
			</div>
		</header>
		<N8nCallout
			v-if="item.remoteError"
			theme="warning"
			data-test-id="inbox-promotion-review-remote-error"
		>
			{{ i18n.baseText(`inbox.promotionReview.detail.remoteError.${item.remoteError}`) }}
		</N8nCallout>
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
