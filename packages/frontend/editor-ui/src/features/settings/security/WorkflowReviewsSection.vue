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
import { useRootStore } from '@n8n/stores/useRootStore';
import * as securitySettingsApi from '@n8n/rest-api-client/api/security-settings';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { WorkflowReviewsPolicy } from '@n8n/api-types';

type ApprovalChoice = 'configurable' | 'required';

const props = defineProps<{
	initialEnabled: boolean;
	initialPublishingNeedsApproval: boolean;
	initialPromotionReviewsEnabled: boolean;
	initialPromotingNeedsApproval: boolean;
	showPromotion: boolean;
	managedByEnv: boolean;
}>();

const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const { showToast, showError } = useToast();

const enabled = ref(props.initialEnabled);
const publishingNeedsApproval = ref(props.initialPublishingNeedsApproval);
const promotionReviewsEnabled = ref(props.initialPromotionReviewsEnabled);
const promotingNeedsApproval = ref(props.initialPromotingNeedsApproval);
const showDisablePublishingDialog = ref(false);
const showDisablePromotionDialog = ref(false);
const isSaving = ref(false);

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

function rememberPolicy() {
	settingsStore.setWorkflowReviewsPolicy({
		enabled: enabled.value,
		publishingNeedsApproval: publishingNeedsApproval.value,
		promotionReviewsEnabled: promotionReviewsEnabled.value,
		promotingNeedsApproval: promotingNeedsApproval.value,
	});
}

/** Enable workflow reviews is the only control that saves. Approval choices stay on the page. */
function holdLocally(patch: Partial<WorkflowReviewsPolicy>) {
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

function applyPolicy(policy: WorkflowReviewsPolicy) {
	enabled.value = policy.enabled;
	rememberPolicy();
}

async function persist(patch: Partial<WorkflowReviewsPolicy>): Promise<void> {
	const savesWorkflowReviews =
		patch.enabled !== undefined &&
		patch.publishingNeedsApproval === undefined &&
		patch.promotionReviewsEnabled === undefined &&
		patch.promotingNeedsApproval === undefined;
	if (!savesWorkflowReviews) {
		holdLocally(patch);
		return;
	}

	const previousEnabled = enabled.value;
	enabled.value = patch.enabled === true;
	isSaving.value = true;

	try {
		const response = await securitySettingsApi.updateSecuritySettings(rootStore.restApiContext, {
			workflowReviews: { enabled: enabled.value },
		});
		if (response.workflowReviews) applyPolicy(response.workflowReviews);
		else rememberPolicy();
		showToast({
			type: 'success',
			title: i18n.baseText(
				`settings.security.workflowReviews.success.${enabled.value ? 'enabled' : 'disabled'}`,
			),
			message: '',
		});
	} catch (error) {
		enabled.value = previousEnabled;
		showError(error, i18n.baseText('settings.security.workflowReviews.error'));
	} finally {
		isSaving.value = false;
	}
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
					:disabled="managedByEnv || isSaving"
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
			:title="i18n.baseText('settings.security.workflowReviews.approval.label')"
			data-test-id="security-workflow-reviews-approval-row"
		>
			<template #action>
				<N8nSelect2
					:model-value="publishingApproval"
					:items="approvalOptions"
					size="medium"
					:disabled="managedByEnv || isSaving"
					data-test-id="security-workflow-reviews-approval-select"
					@update:model-value="onPublishingApproval"
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
					:disabled="managedByEnv || isSaving"
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
			:title="i18n.baseText('settings.security.workflowReviews.approval.label')"
			data-test-id="security-promotion-reviews-approval-row"
		>
			<template #action>
				<N8nSelect2
					:model-value="promotingApproval"
					:items="approvalOptions"
					size="medium"
					:disabled="managedByEnv || isSaving"
					data-test-id="security-promotion-reviews-approval-select"
					@update:model-value="onPromotingApproval"
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
</style>
