<script setup lang="ts">
import type { InboxPromotionReviewItem, PromotionReviewState } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAlertDialog,
	N8nAvatar,
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nText,
	N8nTooltip,
	type BadgeVariant,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref } from 'vue';

import type { InboxItemChange } from '../inbox.constants';
import { formatUserDisplayName } from '../reviews/workflowReviews.utils';
import { approvePromotionReview } from './promotionReviews.api';

const props = defineProps<{
	item: InboxPromotionReviewItem;
	onItemChange: (change: InboxItemChange) => void;
}>();
const i18n = useI18n();
const { showError } = useToast();
const rootStore = useRootStore();
const usersStore = useUsersStore();

const stateBadge: Record<PromotionReviewState, BadgeVariant> = {
	open: 'info',
	changes_requested: 'warning',
	merged: 'success',
	closed: 'subtle',
};

const confirming = ref(false);
const approving = ref(false);

const disabledReason = computed(() => {
	const { item } = props;
	if (item.requester?.id === usersStore.currentUserId) {
		return i18n.baseText('inbox.promotionReview.approve.disabled.requester');
	}
	if (item.reviewState === 'changes_requested') {
		return i18n.baseText('inbox.promotionReview.approve.disabled.changesRequested');
	}
	if (item.hasConflicts) return i18n.baseText('inbox.promotionReview.approve.disabled.conflicts');
	if (item.remoteError) {
		return i18n.baseText(`inbox.promotionReview.remoteError.${item.remoteError}`);
	}
	return null;
});

async function onApprove() {
	const { id, headCommitSha } = props.item;
	if (!headCommitSha || approving.value) return;
	// The Inbox can reconcile this result after the viewer selects another item.
	const onItemChange = props.onItemChange;
	approving.value = true;
	try {
		const { state, updatedAt } = await approvePromotionReview(rootStore.restApiContext, id, {
			headCommitSha,
		});
		onItemChange({ type: 'promotion_review', id, state, updatedAt });
	} catch (error) {
		showError(error, i18n.baseText('inbox.promotionReview.approve.error.title'));
		// Reload the list, so the next attempt uses the current state from GitLab.
		onItemChange({ type: 'promotion_review', id });
	} finally {
		approving.value = false;
		confirming.value = false;
	}
}
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
				<div :class="$style.actions">
					<N8nLink v-if="item.webUrl" :class="$style.gitlabLink" :to="item.webUrl" new-window>
						<N8nIcon icon="arrow-up-right" size="small" />
						{{ i18n.baseText('inbox.promotionReview.detail.openInGitLab') }}
					</N8nLink>
					<!-- A disabled button fires no hover events, so the span carries the tooltip. -->
					<span v-if="item.state === 'open'">
						<N8nTooltip
							:content="disabledReason ?? ''"
							:disabled="!disabledReason"
							:show-after="300"
						>
							<N8nButton
								size="small"
								:disabled="!!disabledReason || !item.headCommitSha"
								:loading="approving"
								data-test-id="inbox-promotion-review-approve"
								@click="confirming = true"
							>
								{{ i18n.baseText('inbox.promotionReview.approve.button') }}
							</N8nButton>
						</N8nTooltip>
					</span>
				</div>
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
		<N8nAlertDialog
			:open="confirming"
			:title="i18n.baseText('inbox.promotionReview.approve.confirm.title')"
			:description="i18n.baseText('inbox.promotionReview.approve.confirm.description')"
			:action-label="i18n.baseText('inbox.promotionReview.approve.button')"
			:loading="approving"
			@action="onApprove"
			@cancel="confirming = false"
			@update:open="confirming = $event"
		/>
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

.actions {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-left: auto;
}

.gitlabLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
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
