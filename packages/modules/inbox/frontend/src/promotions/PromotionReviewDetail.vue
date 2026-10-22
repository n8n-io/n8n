<script setup lang="ts">
import type { InboxPromotionReviewItem, PromotionReviewState } from '@n8n/api-types';
import {
	N8nAvatar,
	N8nBadge,
	N8nCallout,
	N8nExternalLink,
	N8nHeading,
	N8nTabs,
	N8nText,
	type BadgeVariant,
} from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { formatUserDisplayName } from '../reviews/workflowReviews.utils';

defineProps<{ item: InboxPromotionReviewItem }>();
const i18n = useI18n();

const stateBadge: Record<PromotionReviewState, BadgeVariant> = {
	open: 'info',
	changes_requested: 'warning',
	merged: 'success',
	closed: 'subtle',
};

// The editor renders the changes.
const PromotionChanges = computed(() => componentRegistry.get('promotion-changes'));
// One tab for now. The bar matches workflow reviews, which also have an Activity tab.
const tabOptions = computed(() => [
	{ label: i18n.baseText('inbox.promotionReview.detail.tabs.changes'), value: 'changes' as const },
]);
</script>

<template>
	<section :class="$style.detail" data-test-id="inbox-promotion-review-detail">
		<header :class="$style.header">
			<div :class="$style.titleRow">
				<N8nHeading tag="h2" size="xlarge" bold>
					{{ item.title ?? item.branchName ?? i18n.baseText('inbox.promotionReview.untitled') }}
				</N8nHeading>
				<N8nBadge :variant="stateBadge[item.reviewState]" size="xxsmall">
					{{ i18n.baseText(`inbox.promotionReview.state.${item.reviewState}`) }}
				</N8nBadge>
				<N8nExternalLink
					v-if="item.webUrl"
					:class="$style.gitlabLink"
					:href="item.webUrl"
					size="small"
				>
					{{ i18n.baseText('inbox.promotionReview.detail.openInGitLab') }}
				</N8nExternalLink>
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
		<div :class="$style.tabRow">
			<N8nTabs
				model-value="changes"
				:options="tabOptions"
				variant="modern"
				data-test-id="inbox-promotion-review-tab-bar"
			/>
		</div>
		<component :is="PromotionChanges" :class="$style.changes" :review-id="item.id" />
	</section>
</template>

<style module lang="scss">
.detail {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--md);
	min-height: 0;
}

.tabRow {
	/* Holds the active-tab indicator, so the border sits under it. */
	padding-bottom: var(--review-tab-bar--indicator-overhang);
	border-bottom: var(--border);

	> :global(.n8n-tabs) {
		transform: translateY(var(--spacing--sm));
	}
}

.changes {
	flex: 1;
	/* The tab row border already separates the changes from the header. */
	margin-top: calc(-1 * var(--spacing--md));
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
	/* Matches the title row of workflow reviews, so both headings sit at the same height. */
	min-height: var(--spacing--xl);
}

.gitlabLink {
	margin-left: auto;
	/* A standalone external link takes the font size around it. The text next to it is smaller. */
	font-size: var(--font-size--sm);
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
