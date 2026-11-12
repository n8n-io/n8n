<script lang="ts" setup>
import { computed } from 'vue';
import {
	N8nSelect2,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nTooltip,
} from '@n8n/design-system';
import type { SelectOptionBase, SelectValue } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { useWorkflowReviewsFeature } from '@/features/workflow-reviews/composables/useWorkflowReviewsFeature';
import { reviewPrototypeState } from '@/features/workflow-reviews/reviewPrototype.state';

type ApprovalChoice = 'configurable' | 'required';

defineProps<{
	projectId: string | undefined;
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();
const { isWorkflowReviewsEnabled, isPromotionReviewsEnabled } = useWorkflowReviewsFeature();

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
const showSection = computed(() => showPublishing.value || showPromoting.value);

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
</script>

<template>
	<fieldset v-if="showSection" id="projectReviews" data-test-id="project-review-policy-section">
		<N8nSettingsSection
			heading-tag="h3"
			:title="i18n.baseText('projects.settings.reviews.title')"
			:description="i18n.baseText('projects.settings.reviews.description')"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-if="showPublishing"
					:title="i18n.baseText('workflowReviews.enforcement.publishing.title')"
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
					v-if="showPromoting"
					:title="i18n.baseText('workflowReviews.enforcement.promoting.title')"
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
	</fieldset>
</template>

<style module>
.lockedControl {
	display: inline-flex;
}

.lockedControl > * {
	pointer-events: none;
}
</style>
