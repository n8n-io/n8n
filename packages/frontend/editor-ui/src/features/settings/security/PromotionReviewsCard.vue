<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElSwitch } from 'element-plus';
import {
	N8nAlertDialog,
	N8nPreviewBadge,
	N8nSelect2,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nText,
} from '@n8n/design-system';
import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';

import ReviewerPoolSelect from '@/features/workflow-reviews/components/ReviewerPoolSelect.vue';
import { useTeamReviewProjects } from '@/features/workflow-reviews/composables/useTeamReviewProjects';
import {
	countProjectsRequiringApproval,
	isNewVariant,
	isReviewerPool,
	PROMOTION_REVIEW_PROJECTS_VIEW,
	reviewPrototypeState,
} from '@/features/workflow-reviews/reviewPrototype.state';

type ApprovalChoice = 'configurable' | 'required';

withDefaults(
	defineProps<{
		managedByEnv?: boolean;
	}>(),
	{ managedByEnv: false },
);

const settingsStore = useSettingsStore();
const i18n = useI18n();
const router = useRouter();
const { showToast } = useToast();
const { teamProjects } = useTeamReviewProjects();
const showDisableDialog = ref(false);

const enabled = computed(() => reviewPrototypeState.promotionReviewsEnabled);
const approval = computed<ApprovalChoice>(() =>
	reviewPrototypeState.promotingNeedsApproval ? 'required' : 'configurable',
);

const approvalOptions = computed<Array<SelectOptionBase<ApprovalChoice>>>(() => [
	{
		value: 'configurable',
		label: i18n.baseText('settings.security.workflowReviews.approval.instance.optional'),
	},
	{
		value: 'required',
		label: i18n.baseText('settings.security.workflowReviews.approval.instance.required'),
	},
]);

function rememberPolicy() {
	settingsStore.setWorkflowReviewsPolicy({
		enabled: reviewPrototypeState.workflowReviewsEnabled,
		publishingNeedsApproval: reviewPrototypeState.publishingNeedsApproval,
		promotionReviewsEnabled: reviewPrototypeState.promotionReviewsEnabled,
		promotingNeedsApproval: reviewPrototypeState.promotingNeedsApproval,
	});
}

function setEnabled(value: boolean) {
	reviewPrototypeState.promotionReviewsEnabled = value;
	rememberPolicy();
	showToast({
		type: 'success',
		title: i18n.baseText(
			`settings.security.workflowReviews.promotion.success.${value ? 'enabled' : 'disabled'}`,
		),
		message: '',
	});
}

function onToggle(value: string | number | boolean) {
	if (value === true) {
		setEnabled(true);
		return;
	}
	showDisableDialog.value = true;
}

function confirmDisable() {
	showDisableDialog.value = false;
	setEnabled(false);
}

function isApprovalChoice(value: SelectValue | undefined): value is ApprovalChoice {
	return value === 'configurable' || value === 'required';
}

function onApproval(value: SelectValue | undefined) {
	if (!isApprovalChoice(value)) return;
	reviewPrototypeState.promotingNeedsApproval = value === 'required';
	rememberPolicy();
}

function onReviewers(value: SelectValue | undefined) {
	if (!isReviewerPool(value)) return;
	reviewPrototypeState.promotingReviewers = value;
}

const projectsDescription = computed(() =>
	i18n.baseText('settings.security.workflowReviews.projects.description', {
		interpolate: {
			count: countProjectsRequiringApproval(
				teamProjects.value.map((project) => project.id),
				'promoting',
			),
			total: teamProjects.value.length,
		},
	}),
);

function openPromotionProjects() {
	void router.push({ name: PROMOTION_REVIEW_PROJECTS_VIEW });
}
</script>

<template>
	<N8nSettingsRowGroup>
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
					:model-value="enabled"
					size="large"
					:disabled="managedByEnv"
					data-test-id="security-promotion-reviews-toggle"
					@update:model-value="onToggle"
				/>
				<N8nAlertDialog
					:open="showDisableDialog"
					:title="
						i18n.baseText('settings.security.workflowReviews.promotion.confirmDisable.headline')
					"
					:description="
						i18n.baseText('settings.security.workflowReviews.promotion.confirmDisable.message')
					"
					@action="confirmDisable"
					@cancel="showDisableDialog = false"
					@update:open="showDisableDialog = $event"
				/>
			</template>
		</N8nSettingsRow>
		<N8nSettingsRow
			v-if="enabled"
			:show-divider="false"
			:title="i18n.baseText('settings.security.workflowReviews.approval.label')"
			data-test-id="security-promotion-reviews-approval-row"
		>
			<template #action>
				<N8nSelect2
					:model-value="approval"
					:items="approvalOptions"
					size="medium"
					:disabled="managedByEnv"
					data-test-id="security-promotion-reviews-approval-select"
					@update:model-value="onApproval"
				/>
			</template>
		</N8nSettingsRow>
		<N8nSettingsRow
			v-if="enabled"
			:class="$style.followRow"
			:title="i18n.baseText('settings.security.workflowReviews.reviewers.label')"
			data-test-id="security-promotion-reviews-reviewers-row"
		>
			<template #action>
				<ReviewerPoolSelect
					:model-value="reviewPrototypeState.promotingReviewers"
					:disabled="managedByEnv"
					test-id="security-promotion-reviews-reviewers-select"
					@update:model-value="onReviewers"
				/>
			</template>
		</N8nSettingsRow>
		<N8nSettingsRow
			v-if="isNewVariant && enabled"
			clickable
			:title="i18n.baseText('generic.projects')"
			:description="projectsDescription"
			data-test-id="promotion-reviews-projects-row"
			@click="openPromotionProjects"
		>
			<template #action>
				<N8nSettingsRowConfigure
					:value="i18n.baseText('settings.security.workflowReviews.projects.viewAll')"
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
