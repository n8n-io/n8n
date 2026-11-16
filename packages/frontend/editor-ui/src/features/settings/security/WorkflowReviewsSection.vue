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
import type { WorkflowReviewsPolicy } from '@n8n/api-types';

import ReviewerPoolSelect from '@/features/workflow-reviews/components/ReviewerPoolSelect.vue';
import { useTeamReviewProjects } from '@/features/workflow-reviews/composables/useTeamReviewProjects';
import {
	clearTrackApprovals,
	countProjectsRequiringApproval,
	isNewVariant,
	isReviewerPool,
	PUBLISH_REVIEW_PROJECTS_VIEW,
	reviewPrototypeState,
} from '@/features/workflow-reviews/reviewPrototype.state';

import PromotionReviewsCard from './PromotionReviewsCard.vue';

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
const router = useRouter();
const { showToast } = useToast();
const { teamProjects } = useTeamReviewProjects();
const enabled = ref(reviewPrototypeState.workflowReviewsEnabled);
const publishingNeedsApproval = ref(reviewPrototypeState.publishingNeedsApproval);
const showDisablePublishingDialog = ref(false);

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

const publishingApproval = computed<ApprovalChoice>(() =>
	publishingNeedsApproval.value ? 'required' : 'configurable',
);

function isApprovalChoice(value: SelectValue | undefined): value is ApprovalChoice {
	return value === 'configurable' || value === 'required';
}

function onPublishingApproval(value: SelectValue | undefined) {
	if (!isApprovalChoice(value)) return;
	holdLocally({ publishingNeedsApproval: value === 'required' });
}

/** Reviewer pools stay in the prototype store. They do not use the security settings API. */
function onPublishingReviewers(value: SelectValue | undefined) {
	if (!isReviewerPool(value)) return;
	reviewPrototypeState.publishingReviewers = value;
}

function rememberPolicy() {
	reviewPrototypeState.initialized = true;
	reviewPrototypeState.workflowReviewsEnabled = enabled.value;
	reviewPrototypeState.publishingNeedsApproval = publishingNeedsApproval.value;
	settingsStore.setWorkflowReviewsPolicy({
		enabled: enabled.value,
		publishingNeedsApproval: publishingNeedsApproval.value,
		promotionReviewsEnabled: reviewPrototypeState.promotionReviewsEnabled,
		promotingNeedsApproval: reviewPrototypeState.promotingNeedsApproval,
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
}

function persist(patch: Partial<WorkflowReviewsPolicy>): void {
	holdLocally(patch);
}

const showProjectsRow = computed(() => isNewVariant.value && enabled.value);

const projectsDescription = computed(() =>
	i18n.baseText('settings.security.workflowReviews.projects.description', {
		interpolate: {
			count: countProjectsRequiringApproval(
				teamProjects.value.map((project) => project.id),
				'publishing',
			),
			total: teamProjects.value.length,
		},
	}),
);

function openPublishProjects() {
	void router.push({ name: PUBLISH_REVIEW_PROJECTS_VIEW });
}

function confirmDisablePublishing() {
	showDisablePublishingDialog.value = false;
	publishingNeedsApproval.value = false;
	clearTrackApprovals('publishing');
	void persist({ enabled: false });
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
			v-if="enabled"
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
		<N8nSettingsRow
			v-if="showProjectsRow"
			clickable
			:title="i18n.baseText('generic.projects')"
			:description="projectsDescription"
			data-test-id="security-workflow-reviews-projects-row"
			@click="openPublishProjects"
		>
			<template #action>
				<N8nSettingsRowConfigure
					:value="i18n.baseText('settings.security.workflowReviews.projects.viewAll')"
				/>
			</template>
		</N8nSettingsRow>
	</N8nSettingsRowGroup>

	<PromotionReviewsCard v-if="showPromotion && !isNewVariant" :managed-by-env="managedByEnv" />
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
