<script lang="ts" setup>
import { computed } from 'vue';
import {
	N8nPreviewBadge,
	N8nSelect2,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { usePromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';
import { useWorkflowReviewsFeature } from '@/features/workflow-reviews/composables/useWorkflowReviewsFeature';
import ReviewerPoolSelect from '@/features/workflow-reviews/components/ReviewerPoolSelect.vue';
import {
	effectiveCustomReviewerPool,
	isProjectReviewerPoolLocked,
	reviewPrototypeState,
	reviewerPoolsUpTo,
	type ReviewerPool,
} from '@/features/workflow-reviews/reviewPrototype.state';

type ApprovalChoice = 'configurable' | 'required';

defineProps<{
	projectId: string | undefined;
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();
const { isEnabled: environmentsConfigured } = usePromotionsEnabled();
const { isWorkflowReviewsEnabled, isPromotionReviewsEnabled } = useWorkflowReviewsFeature();
const isCustom = computed(() => reviewPrototypeState.mode === 'custom');

const showPublishing = computed(() =>
	reviewPrototypeState.initialized
		? reviewPrototypeState.workflowReviewsEnabled
		: isWorkflowReviewsEnabled.value,
);
const showPromoting = computed(() =>
	reviewPrototypeState.initialized
		? reviewPrototypeState.promotionReviewsEnabled
		: isPromotionReviewsEnabled.value,
);
const instancePublishing = computed(() =>
	reviewPrototypeState.initialized
		? reviewPrototypeState.publishingNeedsApproval
		: settingsStore.settings.workflowReviews?.publishingNeedsApproval === true,
);
const instancePromoting = computed(() =>
	reviewPrototypeState.initialized
		? reviewPrototypeState.promotingNeedsApproval
		: settingsStore.settings.workflowReviews?.promotingNeedsApproval === true,
);
const showPromotionCard = computed(() => showPromoting.value && environmentsConfigured.value);
const showSection = computed(() => showPublishing.value || showPromotionCard.value);

const approvalOptions = computed<Array<SelectOptionBase<ApprovalChoice>>>(() => [
	{
		value: 'configurable',
		label: i18n.baseText('settings.security.workflowReviews.approval.option.configurable'),
	},
	{
		value: 'required',
		label: i18n.baseText('settings.security.workflowReviews.approval.option.required'),
	},
]);

const publishingChoice = computed<ApprovalChoice>(() =>
	instancePublishing.value || reviewPrototypeState.projectPublishing ? 'required' : 'configurable',
);
const promotingChoice = computed<ApprovalChoice>(() =>
	instancePromoting.value || reviewPrototypeState.projectPromoting ? 'required' : 'configurable',
);

function isApprovalChoice(value: SelectValue | undefined): value is ApprovalChoice {
	return value === 'configurable' || value === 'required';
}

function setPublishing(value: SelectValue | undefined) {
	if (instancePublishing.value || !isApprovalChoice(value)) return;
	reviewPrototypeState.projectPublishing = value === 'required';
}

function setPromoting(value: SelectValue | undefined) {
	if (instancePromoting.value || !isApprovalChoice(value)) return;
	reviewPrototypeState.projectPromoting = value === 'required';
}

const publishingReviewers = computed(() =>
	effectiveCustomReviewerPool(
		reviewPrototypeState.publishingReviewers,
		reviewPrototypeState.projectPublishingReviewers,
	),
);
const promotingReviewers = computed(() =>
	effectiveCustomReviewerPool(
		reviewPrototypeState.promotingReviewers,
		reviewPrototypeState.projectPromotingReviewers,
	),
);
const publishingReviewerPools = computed(() =>
	reviewerPoolsUpTo(reviewPrototypeState.publishingReviewers),
);
const promotingReviewerPools = computed(() =>
	reviewerPoolsUpTo(reviewPrototypeState.promotingReviewers),
);
const publishingReviewersLocked = computed(() =>
	isProjectReviewerPoolLocked(reviewPrototypeState.publishingReviewers),
);
const promotingReviewersLocked = computed(() =>
	isProjectReviewerPoolLocked(reviewPrototypeState.promotingReviewers),
);

function setPublishingReviewers(value: ReviewerPool) {
	if (publishingReviewersLocked.value) return;
	reviewPrototypeState.projectPublishingReviewers = value;
}

function setPromotingReviewers(value: ReviewerPool) {
	if (promotingReviewersLocked.value) return;
	reviewPrototypeState.projectPromotingReviewers = value;
}
</script>

<template>
	<fieldset v-if="showSection" id="projectReviews" data-test-id="project-review-policy-section">
		<h3 class="mb-s">
			<label for="projectReviews">
				<span :class="$style.titleRow">
					{{ i18n.baseText('projects.settings.reviews.title') }}
					<N8nPreviewBadge size="xxsmall" data-test-id="project-review-preview-tag" />
				</span>
			</label>
			<N8nText size="small" color="text-base" tag="p" :class="$style.subtitle">
				{{ i18n.baseText('projects.settings.reviews.description') }}
			</N8nText>
		</h3>
		<N8nSettingsSection v-if="!isCustom">
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-if="showPublishing"
					:title="i18n.baseText('workflowReviews.enforcement.publishing.title')"
					data-test-id="project-review-publishing-approval-row"
				>
					<template #action>
						<N8nTooltip v-if="instancePublishing" placement="top">
							<template #content>
								{{ i18n.baseText('workflowReviews.enforcement.lockedByInstance') }}
							</template>
							<span :class="$style.lockedControl">
								<N8nSelect2
									:model-value="publishingChoice"
									:items="approvalOptions"
									size="medium"
									:disabled="true"
									data-test-id="project-review-publishing-toggle"
								/>
							</span>
						</N8nTooltip>
						<N8nSelect2
							v-else
							:model-value="publishingChoice"
							:items="approvalOptions"
							size="medium"
							data-test-id="project-review-publishing-toggle"
							@update:model-value="setPublishing"
						/>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow
					v-if="showPromotionCard"
					:title="i18n.baseText('workflowReviews.enforcement.promoting.title')"
					data-test-id="project-review-promoting-approval-row"
				>
					<template #action>
						<N8nTooltip v-if="instancePromoting" placement="top">
							<template #content>
								{{ i18n.baseText('workflowReviews.enforcement.lockedByInstance') }}
							</template>
							<span :class="$style.lockedControl">
								<N8nSelect2
									:model-value="promotingChoice"
									:items="approvalOptions"
									size="medium"
									:disabled="true"
									data-test-id="project-review-promoting-toggle"
								/>
							</span>
						</N8nTooltip>
						<N8nSelect2
							v-else
							:model-value="promotingChoice"
							:items="approvalOptions"
							size="medium"
							data-test-id="project-review-promoting-toggle"
							@update:model-value="setPromoting"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
		<N8nSettingsSection v-else>
			<N8nSettingsRowGroup>
				<template v-if="showPublishing">
					<N8nSettingsRow
						:show-divider="false"
						:title="i18n.baseText('projects.settings.reviews.publishing.approval')"
						data-test-id="project-review-publishing-approval-row"
					>
						<template #action>
							<N8nTooltip v-if="instancePublishing" placement="top">
								<template #content>
									{{ i18n.baseText('workflowReviews.enforcement.lockedByInstance') }}
								</template>
								<span :class="$style.lockedControl">
									<N8nSelect2
										:model-value="publishingChoice"
										:items="approvalOptions"
										size="medium"
										:disabled="true"
										data-test-id="project-review-publishing-toggle"
									/>
								</span>
							</N8nTooltip>
							<N8nSelect2
								v-else
								:model-value="publishingChoice"
								:items="approvalOptions"
								size="medium"
								data-test-id="project-review-publishing-toggle"
								@update:model-value="setPublishing"
							/>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						:class="$style.followRow"
						:title="i18n.baseText('projects.settings.reviews.publishing.reviewers')"
						data-test-id="project-review-publishing-reviewers-row"
					>
						<template #action>
							<ReviewerPoolSelect
								:model-value="publishingReviewers"
								:allowed-pools="publishingReviewerPools"
								:locked="publishingReviewersLocked"
								test-id="project-review-publishing-reviewers"
								@update:model-value="setPublishingReviewers"
							/>
						</template>
					</N8nSettingsRow>
				</template>
				<template v-if="showPromotionCard">
					<N8nSettingsRow
						:show-divider="false"
						:title="i18n.baseText('projects.settings.reviews.promoting.approval')"
						data-test-id="project-review-promoting-approval-row"
					>
						<template #action>
							<N8nTooltip v-if="instancePromoting" placement="top">
								<template #content>
									{{ i18n.baseText('workflowReviews.enforcement.lockedByInstance') }}
								</template>
								<span :class="$style.lockedControl">
									<N8nSelect2
										:model-value="promotingChoice"
										:items="approvalOptions"
										size="medium"
										:disabled="true"
										data-test-id="project-review-promoting-toggle"
									/>
								</span>
							</N8nTooltip>
							<N8nSelect2
								v-else
								:model-value="promotingChoice"
								:items="approvalOptions"
								size="medium"
								data-test-id="project-review-promoting-toggle"
								@update:model-value="setPromoting"
							/>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						:class="$style.followRow"
						:title="i18n.baseText('projects.settings.reviews.promoting.reviewers')"
						data-test-id="project-review-promoting-reviewers-row"
					>
						<template #action>
							<ReviewerPoolSelect
								:model-value="promotingReviewers"
								:allowed-pools="promotingReviewerPools"
								:locked="promotingReviewersLocked"
								test-id="project-review-promoting-reviewers"
								@update:model-value="setPromotingReviewers"
							/>
						</template>
					</N8nSettingsRow>
				</template>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
	</fieldset>
</template>

<style module>
.lockedControl {
	display: inline-flex;
}

.lockedControl > * {
	pointer-events: none;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.subtitle {
	margin: 0;
}

/* Pull the second row of a pair up by one inset. The rows keep their own height. */
.followRow {
	margin-top: calc(-1 * var(--spacing--sm));
}
</style>
