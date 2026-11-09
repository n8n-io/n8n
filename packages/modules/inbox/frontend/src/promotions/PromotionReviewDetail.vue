<script setup lang="ts">
import type {
	InboxPromotionReviewItem,
	PromotionReviewState,
	WorkflowReviewRequestDetail,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAvatar,
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nEmptyState,
	N8nExternalLink,
	N8nHeading,
	N8nIcon,
	N8nTabs,
	N8nText,
	type BadgeVariant,
} from '@n8n/design-system';
import { componentRegistry, type PromotionChangesState } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, provide, ref, useId, useTemplateRef, watch } from 'vue';

import InboxAvatarTooltip from '../components/InboxAvatarTooltip.vue';
import type { InboxItemChange } from '../inbox.constants';
import PrototypeEditableBody from '../prototype/PrototypeEditableBody.vue';
import PrototypeEditableTitle from '../prototype/PrototypeEditableTitle.vue';
import { prototypeDescription, prototypeTitle } from '../prototype/prototype.session';
import WorkflowReviewActivityFeed from '../reviews/components/WorkflowReviewActivityFeed.vue';
import WorkflowReviewCommentComposer from '../reviews/components/WorkflowReviewCommentComposer.vue';
import WorkflowReviewDetailMetadata from '../reviews/components/WorkflowReviewDetailMetadata.vue';
import { ReviewDetailScrollContainerKey, ReviewLinkedWorkflowsKey } from '../reviews/constants';
import { useReviewActivityStore } from '../reviews/reviewActivity.store';
import { formatUserDisplayName, toError } from '../reviews/workflowReviews.utils';
import { approvePromotionReview, getPromotionReviewChanges } from './promotionReviews.api';

const props = defineProps<{
	item: InboxPromotionReviewItem;
	onItemChange: (change: InboxItemChange) => void;
	/**
	 * Prototype only. The review data for an Activity tab with the workflow review layout.
	 * Without it, the product shows Changes only.
	 */
	activityReview?: WorkflowReviewRequestDetail;
}>();
const i18n = useI18n();
const { showError } = useToast();
const rootStore = useRootStore();
const disabledReasonId = useId();
const newCommitsId = useId();

const descriptionText = computed(() =>
	prototypeDescription(
		props.activityReview?.id ?? props.item.id,
		props.activityReview?.description ?? '',
	),
);
const displayTitle = computed(() =>
	prototypeTitle(
		props.item.id,
		props.activityReview?.title ??
			props.item.title ??
			props.item.branchName ??
			i18n.baseText('inbox.promotionReview.untitled'),
	),
);

const stateBadge: Record<PromotionReviewState, BadgeVariant> = {
	open: 'info',
	changes_requested: 'warning',
	merged: 'success',
	closed: 'subtle',
};

// The editor renders the changes.
const PromotionChanges = computed(() => componentRegistry.get('promotion-changes'));
type DetailTab = 'activity' | 'changes';
const detailTab = ref<DetailTab>('changes');
const activityStore = useReviewActivityStore();
provide(ReviewDetailScrollContainerKey, useTemplateRef<HTMLElement>('detailBody'));
provide(
	ReviewLinkedWorkflowsKey,
	computed(
		() =>
			new Map(
				(props.activityReview?.workflows ?? []).map((workflow) => [
					workflow.workflowId,
					{
						workflowName: workflow.workflowName,
						pinnedVersionId: workflow.workflowVersionId,
						pinnedVersionName: workflow.pinnedVersion?.name ?? null,
					},
				]),
			),
	),
);
watch(
	() => props.activityReview?.id,
	(id) => {
		detailTab.value = id ? 'activity' : 'changes';
		if (id) void activityStore.fetchFeed(id);
	},
	{ immediate: true },
);
// Changed resources only. An unchanged project is a folder in the tree, not a change.
const changeCount = ref<number | null>(null);
watch(
	() => props.item.id,
	async (id) => {
		changeCount.value = null;
		try {
			const result = await getPromotionReviewChanges(rootStore.restApiContext, id);
			if (props.item.id !== id) return;
			changeCount.value = result.resources.filter(
				(resource) => resource.change !== 'unchanged',
			).length;
		} catch {
			if (props.item.id === id) changeCount.value = null;
		}
	},
	{ immediate: true },
);
const tabOptions = computed(() => [
	...(props.activityReview
		? [
				{
					label: i18n.baseText('inbox.promotionReview.detail.tabs.activity'),
					value: 'activity' as const,
				},
			]
		: []),
	{
		label: i18n.baseText('inbox.promotionReview.detail.tabs.changes'),
		value: 'changes' as const,
		tag: changeCount.value === null ? undefined : String(changeCount.value),
	},
]);

// Approve sends the head of the changes that the reviewer saw. A list refresh can report a newer
// head, which the reviewer did not see.
const changes = ref<PromotionChangesState>({ status: 'loading' });
watch(
	() => props.item.id,
	() => (changes.value = { status: 'loading' }),
);

const hasNewCommits = computed(
	() =>
		changes.value.status === 'ready' &&
		!!props.item.headCommitSha &&
		changes.value.headCommitSha !== props.item.headCommitSha,
);
const withoutEnvironment = computed(() => props.item.remoteError === 'no_connection');
const endedAs = computed(() => (props.item.reviewState === 'merged' ? 'merged' : 'closed'));
// A new key mounts the Changes tab again, so it loads the newest head.
const changesKey = ref(0);

/** What the admin confirms. A later change of the selected row does not change it. */
const pendingApproval = ref<{ id: string; headCommitSha: string } | null>(null);
const approving = ref(false);

const disabledReason = computed(() => {
	const { item } = props;
	if (item.reviewState === 'changes_requested') {
		return i18n.baseText('inbox.promotionReview.approve.disabled.changesRequested');
	}
	if (item.hasConflicts) return i18n.baseText('inbox.promotionReview.approve.disabled.conflicts');
	if (item.remoteError) {
		return i18n.baseText(`inbox.promotionReview.remoteError.${item.remoteError}`);
	}
	if (!item.headCommitSha) {
		return i18n.baseText('inbox.promotionReview.approve.disabled.noHeadCommit');
	}
	if (changes.value.status === 'unavailable') {
		return i18n.baseText('inbox.promotionReview.approve.disabled.changesUnavailable');
	}
	return null;
});
// Loading and new commits show no reason under Approve: loading is short, and the new commits
// callout above the changes explains itself. Screen readers get that callout as the reason.
const approveDisabled = computed(
	() => !!disabledReason.value || hasNewCommits.value || changes.value.status !== 'ready',
);
const approveDescribedBy = computed(() => {
	if (disabledReason.value) return disabledReasonId;
	return hasNewCommits.value ? newCommitsId : undefined;
});

function openApproval() {
	if (changes.value.status !== 'ready') return;
	pendingApproval.value = { id: props.item.id, headCommitSha: changes.value.headCommitSha };
}

// A close cannot stop GitLab, so the dialog stays open until the request ends.
function closeApproval() {
	if (!approving.value) pendingApproval.value = null;
}

async function onApprove() {
	if (!pendingApproval.value || approving.value) return;
	const { id, headCommitSha } = pendingApproval.value;
	// The Inbox can reconcile this result after the viewer selects another item.
	const onItemChange = props.onItemChange;
	approving.value = true;
	try {
		const { state, updatedAt } = await approvePromotionReview(rootStore.restApiContext, id, {
			headCommitSha,
		});
		onItemChange({ type: 'promotion_review', id, state, updatedAt });
	} catch (error: unknown) {
		showError(toError(error), i18n.baseText('inbox.promotionReview.approve.error.title'));
		// Reload the list, so the next attempt uses the current state from GitLab.
		onItemChange({ type: 'promotion_review', id });
	} finally {
		approving.value = false;
		pendingApproval.value = null;
	}
}
</script>

<template>
	<section
		:class="[$style.detail, { [$style.activityDetail]: activityReview }]"
		data-test-id="inbox-promotion-review-detail"
	>
		<div v-if="activityReview" :class="$style.columnTitle">
			<div :class="$style.reviewTitle">
				<PrototypeEditableTitle :item-id="item.id" :text="displayTitle" />
			</div>
		</div>
		<header v-else :class="$style.header">
			<div :class="$style.titleRow">
				<!-- Inline, so the state tag follows the last word of a title that wraps. -->
				<div :class="$style.title">
					<N8nHeading tag="h2" size="xlarge" bold :class="$style.titleText">
						{{ item.title ?? item.branchName ?? i18n.baseText('inbox.promotionReview.untitled') }}
					</N8nHeading>
					<N8nBadge
						:variant="stateBadge[item.reviewState]"
						size="xxsmall"
						:class="$style.stateBadge"
					>
						{{ i18n.baseText(`inbox.promotionReview.state.${item.reviewState}`) }}
					</N8nBadge>
				</div>
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
					<InboxAvatarTooltip :name="formatUserDisplayName(item.approver)">
						<N8nAvatar
							:first-name="item.approver.firstName"
							:last-name="item.approver.lastName"
							size="xsmall"
						/>
					</InboxAvatarTooltip>
					<N8nText size="small">{{ formatUserDisplayName(item.approver) }}</N8nText>
				</span>
				<span v-if="item.requester" :class="$style.metaItem">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('inbox.promotionReview.detail.requestedBy') }}
					</N8nText>
					<InboxAvatarTooltip :name="formatUserDisplayName(item.requester)">
						<N8nAvatar
							:first-name="item.requester.firstName"
							:last-name="item.requester.lastName"
							size="xsmall"
						/>
					</InboxAvatarTooltip>
					<N8nText size="small">{{ formatUserDisplayName(item.requester) }}</N8nText>
				</span>
			</div>
		</header>
		<N8nCallout
			v-if="item.remoteError && !withoutEnvironment"
			theme="warning"
			data-test-id="inbox-promotion-review-remote-error"
		>
			{{ i18n.baseText(`inbox.promotionReview.detail.remoteError.${item.remoteError}`) }}
		</N8nCallout>
		<div :class="$style.tabRow">
			<N8nTabs
				:model-value="detailTab"
				:options="tabOptions"
				variant="modern"
				data-test-id="inbox-promotion-review-tab-bar"
				@update:model-value="detailTab = $event === 'activity' ? 'activity' : 'changes'"
			/>
			<!-- Same slot as Discard and close on a self-healing result: the ghost action left of the main button. -->
			<div :class="$style.tabActions">
				<N8nButton
					v-if="activityReview && item.webUrl"
					variant="ghost"
					size="small"
					:href="item.webUrl"
					target="_blank"
					data-test-id="inbox-promotion-review-gitlab"
				>
					{{ i18n.baseText('inbox.promotionReview.detail.viewInGitLab') }}
					<N8nIcon icon="external-link" size="small" />
				</N8nButton>
				<div v-if="item.state === 'open'" :class="$style.approve">
					<!-- Visible text, not a tooltip: a disabled button cannot take keyboard focus. -->
					<N8nText
						v-if="disabledReason"
						:id="disabledReasonId"
						size="small"
						color="text-light"
						data-test-id="inbox-promotion-review-approve-reason"
					>
						{{ disabledReason }}
					</N8nText>
					<N8nButton
						size="small"
						:disabled="approveDisabled"
						:loading="approving"
						:aria-describedby="approveDescribedBy"
						data-test-id="inbox-promotion-review-approve"
						@click="openApproval"
					>
						{{ i18n.baseText('inbox.promotionReview.approve.button') }}
					</N8nButton>
				</div>
			</div>
		</div>
		<!-- The same activity layout as a workflow review: feed, description card, composer, and rail. -->
		<div v-if="activityReview && detailTab === 'activity'" :class="$style.activityContainer">
			<div ref="detailBody" :class="$style.detailBody">
				<div :class="$style.activityPanel" data-test-id="inbox-promotion-review-activity-panel">
					<WorkflowReviewActivityFeed :key="activityReview.id">
						<template #header>
							<div :class="$style.descriptionCard">
								<N8nText tag="h3" bold color="text-light" size="medium">
									{{ i18n.baseText('workflowReviews.detail.activity.description') }}
								</N8nText>
								<PrototypeEditableBody :item-id="activityReview.id" :text="descriptionText">
									<N8nText color="text-base" size="medium" :class="$style.description">
										{{ descriptionText }}
									</N8nText>
								</PrototypeEditableBody>
							</div>
						</template>
						<template v-if="activityReview.state === 'open'" #composer>
							<WorkflowReviewCommentComposer :can-comment="activityReview.viewerCanComment" />
						</template>
					</WorkflowReviewActivityFeed>
				</div>
				<WorkflowReviewDetailMetadata :review="activityReview" />
			</div>
		</div>
		<div v-else :class="$style.changesArea">
			<N8nCallout
				v-if="hasNewCommits"
				theme="warning"
				slim
				:class="$style.newCommits"
				data-test-id="inbox-promotion-review-new-commits"
			>
				<span :id="newCommitsId">{{
					i18n.baseText('inbox.promotionReview.changes.newCommits')
				}}</span>
				<template #trailingContent>
					<N8nButton
						variant="outline"
						size="small"
						data-test-id="inbox-promotion-review-reload-changes"
						@click="changesKey++"
					>
						{{ i18n.baseText('inbox.promotionReview.changes.reload') }}
					</N8nButton>
				</template>
			</N8nCallout>
			<N8nEmptyState
				v-if="withoutEnvironment"
				:class="$style.changes"
				:icon="{ type: 'icon', value: endedAs === 'merged' ? 'check' : 'circle-check' }"
				:heading="i18n.baseText(`promotions.review.outcome.${endedAs}.title`)"
				:description="i18n.baseText('inbox.promotionReview.changes.withoutEnvironment')"
				data-test-id="inbox-promotion-review-without-environment"
			/>
			<component
				:is="PromotionChanges"
				v-else
				:key="changesKey"
				:class="$style.changes"
				:review-id="item.id"
				@state="changes = $event"
			/>
		</div>
		<N8nDialog
			:open="!!pendingApproval"
			size="small"
			:show-close-button="false"
			:close-on-overlay-click="!approving"
			:close-on-escape="!approving"
			@update:open="closeApproval"
		>
			<N8nDialogHeader>
				<N8nDialogTitle>
					{{ i18n.baseText('inbox.promotionReview.approve.confirm.title') }}
				</N8nDialogTitle>
				<N8nDialogDescription>
					{{ i18n.baseText('inbox.promotionReview.approve.confirm.description') }}
				</N8nDialogDescription>
			</N8nDialogHeader>
			<N8nDialogFooter>
				<N8nButton
					variant="outline"
					:label="i18n.baseText('generic.cancel')"
					:disabled="approving"
					@click="closeApproval"
				/>
				<N8nButton
					:label="i18n.baseText('inbox.promotionReview.approve.button')"
					:loading="approving"
					@click="onApprove"
				/>
			</N8nDialogFooter>
		</N8nDialog>
	</section>
</template>

<style module lang="scss">
@use '../reviews/components/activity-card' as *;

.detail {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--md);
	min-height: 0;
}

.activityDetail {
	gap: 0;
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

.tabRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	border-bottom: var(--border);

	> :global(.n8n-tabs) {
		align-self: flex-end;
		/* The active-tab indicator covers the divider, as on Open and Closed. */
		margin-bottom: calc(-1 * var(--border-width));

		/* Same height for every tab, so a label without a badge lines up with one that has one.
		   The active border stays on the divider. */
		:global([role='tablist']) {
			align-items: stretch;
		}

		:global([role='tablist']) > * {
			display: flex;
			align-items: stretch;
		}

		:global([role='tablist']) > * > * {
			display: flex;
			flex: 1;
			align-items: stretch;
		}

		:global([role='tab']) {
			flex: 1;
			box-sizing: border-box;
		}
	}
}

.changesArea {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
}

/* The old header leaves a gap above the changes. The tab row border already separates them. */
.detail:not(.activityDetail) .changesArea {
	margin-top: calc(-1 * var(--spacing--md));
}

.newCommits {
	/* The same space as the warnings of the changes. */
	margin-top: var(--spacing--sm);
}

.changes {
	flex: 1;
	min-height: 0;
}

/* Copied from the tab body of a workflow review, so both Activity tabs share one layout. */
.activityContainer {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
}

.detailBody {
	display: flex;
	flex: 1;
	gap: var(--spacing--md);
	min-height: 0;
	overflow: auto;
	padding-top: var(--spacing--sm);
}

.activityPanel {
	flex: 1;
	min-width: 0;
	max-width: var(--review-activity--max-width, 45rem);
	margin-inline: auto;
}

.descriptionCard {
	@include activity-card;

	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.description {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

@container review-detail (max-width: 44rem) {
	.detailBody {
		flex-direction: column;
	}

	.activityPanel {
		margin-inline: 0;
	}
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

.title {
	flex: 1;
	min-width: 0;
	/* The font of the heading, so the tag lines up with the title text. */
	font-size: var(--font-size--xl);
	line-height: var(--line-height--sm);
}

.titleText {
	display: inline;
}

.stateBadge {
	margin-left: var(--spacing--xs);
	vertical-align: middle;
}

.tabActions {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--2xs);
	/* The tab label sits above the row center, clear of the underline. Match that. */
	margin-bottom: calc(var(--spacing--xs) + 2px - var(--spacing--4xs));
}

.approve {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--xs);
}

.gitlabLink {
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
