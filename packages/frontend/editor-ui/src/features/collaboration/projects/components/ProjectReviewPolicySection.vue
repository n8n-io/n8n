<script lang="ts" setup>
import { computed } from 'vue';
import { N8nSettingsRowGroup, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';

import WorkflowReviewEnforcementRows from '@/features/settings/security/WorkflowReviewEnforcementRows.vue';
import { useWorkflowReviewsFeature } from '@/features/workflow-reviews/composables/useWorkflowReviewsFeature';
import { reviewPrototypeState } from '@/features/workflow-reviews/reviewPrototype.state';

defineProps<{
	projectId: string | undefined;
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();
const { isWorkflowReviewsEnabled, isPromotionReviewsEnabled } = useWorkflowReviewsFeature();

const instancePublishing = computed(
	() => settingsStore.settings.workflowReviews?.publishingNeedsApproval === true,
);
const instancePromoting = computed(
	() => settingsStore.settings.workflowReviews?.promotingNeedsApproval === true,
);
const showPublishing = computed(() => isWorkflowReviewsEnabled.value);
const showPromoting = computed(() => isPromotionReviewsEnabled.value);
const showSection = computed(() => showPublishing.value || showPromoting.value);

function setPublishing(value: boolean) {
	if (instancePublishing.value) return;
	reviewPrototypeState.projectPublishing = value;
}

function setPromoting(value: boolean) {
	if (instancePromoting.value) return;
	reviewPrototypeState.projectPromoting = value;
}
</script>

<template>
	<fieldset v-if="showSection" id="projectReviews" data-test-id="project-review-policy-section">
		<h3>{{ i18n.baseText('projects.settings.reviews.title') }}</h3>
		<N8nText size="small" color="text-base" :class="$style.description">
			{{ i18n.baseText('projects.settings.reviews.description') }}
		</N8nText>
		<N8nSettingsRowGroup>
			<WorkflowReviewEnforcementRows
				:show-publishing="showPublishing"
				:show-promoting="showPromoting"
				:publishing="instancePublishing || reviewPrototypeState.projectPublishing"
				:promoting="instancePromoting || reviewPrototypeState.projectPromoting"
				:publishing-locked="instancePublishing"
				:promoting-locked="instancePromoting"
				publishing-test-id="project-review-publishing-toggle"
				promoting-test-id="project-review-promoting-toggle"
				@update:publishing="setPublishing"
				@update:promoting="setPromoting"
			/>
		</N8nSettingsRowGroup>
	</fieldset>
</template>

<style module>
.description {
	display: block;
	margin-bottom: var(--spacing--sm);
}
</style>
