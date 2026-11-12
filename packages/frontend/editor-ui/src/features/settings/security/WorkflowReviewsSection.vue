<script lang="ts" setup>
import { computed, ref } from 'vue';
import { ElSwitch } from 'element-plus';
import {
	N8nAlertDialog,
	N8nPreviewBadge,
	N8nSelect2,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nText,
} from '@n8n/design-system';
import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { WorkflowReviewsPolicy } from '@n8n/api-types';

import ReviewerPoolSelect from '@/features/workflow-reviews/components/ReviewerPoolSelect.vue';
import {
	isReviewerPool,
	reviewPrototypeState,
} from '@/features/workflow-reviews/reviewPrototype.state';

type ApprovalChoice = 'configurable' | 'required';

defineProps<{
	initialEnabled: boolean;
	initialPublishingNeedsApproval: boolean;
	initialPromotionReviewsEnabled: boolean;
	initialPromotingNeedsApproval: boolean;
	showPromotion: boolean;
	managedByEnv: boolean;
}>();

const settingsStore = useSettingsStore();
const i18n = useI18n();
const { showToast } = useToast();

// Start from the prototype. Do not copy the server flags. Custom does not change them.
const enabled = ref(reviewPrototypeState.workflowReviewsEnabled);
const publishingNeedsApproval = ref(reviewPrototypeState.publishingNeedsApproval);
const promotionReviewsEnabled = ref(reviewPrototypeState.promotionReviewsEnabled);
const promotingNeedsApproval = ref(reviewPrototypeState.promotingNeedsApproval);
const showDisablePublishingDialog = ref(false);
const showDisablePromotionDialog = ref(false);

const publishingToggle = computed({
	get: () => enabled.value,
	set: (value: boolean) => {
		if (!value) {
			showDisablePublishingDialog.value = true;
			return;
		}
		void persist({ enabled: true });
	},
});

const promotionToggle = computed({
	get: () => promotionReviewsEnabled.value,
	set: (value: boolean) => {
		if (!value) {
			showDisablePromotionDialog.value = true;
			return;
		}
		void persist({ promotionReviewsEnabled: true });
	},
});

const isCustom = computed(() => reviewPrototypeState.mode === 'custom');

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

const publishingApproval = computed<ApprovalChoice>(() =>
	publishingNeedsApproval.value ? 'required' : 'configurable',
);
const promotingApproval = computed<ApprovalChoice>(() =>
	promotingNeedsApproval.value ? 'required' : 'configurable',
);

function isApprovalChoice(value: SelectValue | undefined): value is ApprovalChoice {
	return value === 'configurable' || value === 'required';
}

function onPublishingApproval(value: SelectValue | undefined) {
	if (!isApprovalChoice(value)) return;
	holdLocally({ publishingNeedsApproval: value === 'required' });
}

function onPromotingApproval(value: SelectValue | undefined) {
	if (!isApprovalChoice(value)) return;
	holdLocally({ promotingNeedsApproval: value === 'required' });
}

/** Reviewer pools stay in the prototype store. They do not use the security settings API. */
function onPublishingReviewers(value: SelectValue | undefined) {
	if (!isReviewerPool(value)) return;
	reviewPrototypeState.publishingReviewers = value;
}

function onPromotingReviewers(value: SelectValue | undefined) {
	if (!isReviewerPool(value)) return;
	reviewPrototypeState.promotingReviewers = value;
}

function rememberPolicy() {
	reviewPrototypeState.initialized = true;
	reviewPrototypeState.workflowReviewsEnabled = enabled.value;
	reviewPrototypeState.promotionReviewsEnabled = promotionReviewsEnabled.value;
	reviewPrototypeState.publishingNeedsApproval = publishingNeedsApproval.value;
	reviewPrototypeState.promotingNeedsApproval = promotingNeedsApproval.value;
	settingsStore.setWorkflowReviewsPolicy({
		enabled: enabled.value,
		publishingNeedsApproval: publishingNeedsApproval.value,
		promotionReviewsEnabled: promotionReviewsEnabled.value,
		promotingNeedsApproval: promotingNeedsApproval.value,
	});
}

rememberPolicy();

/** Keep every review switch on this page. Do not call the security settings API. */
function holdLocally(patch: Partial<WorkflowReviewsPolicy>) {
	if (patch.enabled !== undefined) {
		enabled.value = patch.enabled;
	}
	if (patch.publishingNeedsApproval !== undefined) {
		publishingNeedsApproval.value = patch.publishingNeedsApproval;
	}
	if (patch.promotionReviewsEnabled !== undefined) {
		promotionReviewsEnabled.value = patch.promotionReviewsEnabled;
	}
	if (patch.promotingNeedsApproval !== undefined) {
		promotingNeedsApproval.value = patch.promotingNeedsApproval;
	}
	rememberPolicy();
	if (patch.enabled !== undefined) {
		showToast({
			type: 'success',
			title: i18n.baseText(
				`settings.security.workflowReviews.success.${patch.enabled ? 'enabled' : 'disabled'}`,
			),
			message: '',
		});
	}
	if (patch.promotionReviewsEnabled !== undefined) {
		showToast({
			type: 'success',
			title: i18n.baseText(
				`settings.security.workflowReviews.promotion.success.${patch.promotionReviewsEnabled ? 'enabled' : 'disabled'}`,
			),
			message: '',
		});
	}
}

function persist(patch: Partial<WorkflowReviewsPolicy>): void {
	holdLocally(patch);
}

function confirmDisablePublishing() {
	showDisablePublishingDialog.value = false;
	void persist({ enabled: false });
}

function confirmDisablePromotion() {
	showDisablePromotionDialog.value = false;
	void persist({ promotionReviewsEnabled: false });
}
</script>

<template>
	<N8nSettingsRowGroup>
		<N8nSettingsRow>
			<template #info>
				<div :class="$style.titleRow">
					<N8nText :bold="true">
						{{ i18n.baseText('settings.security.workflowReviews.enable.title') }}
					</N8nText>
					<N8nPreviewBadge size="xxsmall" data-test-id="security-workflow-reviews-preview-tag" />
				</div>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.security.workflowReviews.enable.description') }}
				</N8nText>
			</template>
			<template #action>
				<ElSwitch
					v-model="publishingToggle"
					size="large"
					:disabled="managedByEnv"
					data-test-id="security-workflow-reviews-toggle"
				/>
				<N8nAlertDialog
					:open="showDisablePublishingDialog"
					:title="i18n.baseText('settings.security.workflowReviews.confirmDisable.headline')"
					:description="i18n.baseText('settings.security.workflowReviews.confirmDisable.message')"
					@action="confirmDisablePublishing"
					@cancel="showDisablePublishingDialog = false"
					@update:open="showDisablePublishingDialog = $event"
				/>
			</template>
		</N8nSettingsRow>
		<N8nSettingsRow
			v-if="enabled"
			:show-divider="false"
			:title="i18n.baseText('settings.security.workflowReviews.approval.label')"
			data-test-id="security-workflow-reviews-approval-row"
		>
			<template #action>
				<N8nSelect2
					:model-value="publishingApproval"
					:items="approvalOptions"
					size="medium"
					:disabled="managedByEnv"
					data-test-id="security-workflow-reviews-approval-select"
					@update:model-value="onPublishingApproval"
				/>
			</template>
		</N8nSettingsRow>
		<N8nSettingsRow
			v-if="enabled && isCustom"
			:class="$style.followRow"
			:title="i18n.baseText('settings.security.workflowReviews.reviewers.label')"
			data-test-id="security-workflow-reviews-reviewers-row"
		>
			<template #action>
				<ReviewerPoolSelect
					:model-value="reviewPrototypeState.publishingReviewers"
					:disabled="managedByEnv"
					test-id="security-workflow-reviews-reviewers-select"
					@update:model-value="onPublishingReviewers"
				/>
			</template>
		</N8nSettingsRow>
	</N8nSettingsRowGroup>

	<N8nSettingsRowGroup v-if="showPromotion">
		<N8nSettingsRow>
			<template #info>
				<div :class="$style.titleRow">
					<N8nText :bold="true">
						{{ i18n.baseText('settings.security.workflowReviews.promotion.enable.title') }}
					</N8nText>
					<N8nPreviewBadge size="xxsmall" data-test-id="security-promotion-reviews-preview-tag" />
				</div>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.security.workflowReviews.promotion.enable.description') }}
				</N8nText>
			</template>
			<template #action>
				<ElSwitch
					v-model="promotionToggle"
					size="large"
					:disabled="managedByEnv"
					data-test-id="security-promotion-reviews-toggle"
				/>
				<N8nAlertDialog
					:open="showDisablePromotionDialog"
					:title="
						i18n.baseText('settings.security.workflowReviews.promotion.confirmDisable.headline')
					"
					:description="
						i18n.baseText('settings.security.workflowReviews.promotion.confirmDisable.message')
					"
					@action="confirmDisablePromotion"
					@cancel="showDisablePromotionDialog = false"
					@update:open="showDisablePromotionDialog = $event"
				/>
			</template>
		</N8nSettingsRow>
		<N8nSettingsRow
			v-if="promotionReviewsEnabled"
			:show-divider="false"
			:title="i18n.baseText('settings.security.workflowReviews.approval.label')"
			data-test-id="security-promotion-reviews-approval-row"
		>
			<template #action>
				<N8nSelect2
					:model-value="promotingApproval"
					:items="approvalOptions"
					size="medium"
					:disabled="managedByEnv"
					data-test-id="security-promotion-reviews-approval-select"
					@update:model-value="onPromotingApproval"
				/>
			</template>
		</N8nSettingsRow>
		<N8nSettingsRow
			v-if="promotionReviewsEnabled && isCustom"
			:class="$style.followRow"
			:title="i18n.baseText('settings.security.workflowReviews.reviewers.label')"
			data-test-id="security-promotion-reviews-reviewers-row"
		>
			<template #action>
				<ReviewerPoolSelect
					:model-value="reviewPrototypeState.promotingReviewers"
					:disabled="managedByEnv"
					test-id="security-promotion-reviews-reviewers-select"
					@update:model-value="onPromotingReviewers"
				/>
			</template>
		</N8nSettingsRow>
	</N8nSettingsRowGroup>
</template>

<style module>
.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

/* Pull Reviewers up by one inset. The rows keep their own height. */
.followRow {
	margin-top: calc(-1 * var(--spacing--sm));
}
</style>
