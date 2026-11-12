<script setup lang="ts">
import { computed } from 'vue';
import { ElCol, ElRow, ElSwitch } from 'element-plus';
import { N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { ReviewRequirementLock } from '@n8n/api-types';

import { usePromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';
import { reviewPrototypeState } from '@/features/workflow-reviews/reviewPrototype.state';

const props = defineProps<{
	workflowId: string;
	canEdit: boolean;
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();
const { isEnabled: environmentsConfigured } = usePromotionsEnabled();

const showPublishing = computed(() => {
	if (!reviewPrototypeState.initialized) return true;
	return reviewPrototypeState.workflowReviewsEnabled;
});
const showPromoting = computed(() => {
	if (!environmentsConfigured.value) return false;
	if (!reviewPrototypeState.initialized) return true;
	return reviewPrototypeState.promotionReviewsEnabled;
});

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
const publishingLockedBy = computed((): ReviewRequirementLock | null => {
	if (instancePublishing.value) return 'instance';
	if (reviewPrototypeState.projectPublishing) return 'project';
	return null;
});
const promotingLockedBy = computed((): ReviewRequirementLock | null => {
	if (instancePromoting.value) return 'instance';
	if (reviewPrototypeState.projectPromoting) return 'project';
	return null;
});
const publishingOn = computed(
	() =>
		publishingLockedBy.value !== null ||
		reviewPrototypeState.workflowPublishing[props.workflowId] === true,
);
const promotingOn = computed(
	() =>
		promotingLockedBy.value !== null ||
		reviewPrototypeState.workflowPromoting[props.workflowId] === true,
);

function lockTooltip(lockedBy: ReviewRequirementLock | null): string {
	if (lockedBy === 'instance') return i18n.baseText('workflowReviews.enforcement.lockedByInstance');
	if (lockedBy === 'project') return i18n.baseText('workflowReviews.enforcement.lockedByProject');
	return '';
}

function onPublishing(value: string | number | boolean) {
	if (!props.canEdit || publishingLockedBy.value) return;
	reviewPrototypeState.workflowPublishing[props.workflowId] = value === true;
}

function onPromoting(value: string | number | boolean) {
	if (!props.canEdit || promotingLockedBy.value) return;
	reviewPrototypeState.workflowPromoting[props.workflowId] = value === true;
}
</script>

<template>
	<ElRow v-if="showPublishing" data-test-id="workflow-settings-publishing-approval">
		<ElCol :span="10" :class="$style.label">
			{{ i18n.baseText('workflowReviews.enforcement.publishing.title') }}
		</ElCol>
		<ElCol :span="14">
			<N8nTooltip :disabled="publishingLockedBy === null" placement="top">
				<template #content>
					{{ lockTooltip(publishingLockedBy) }}
				</template>
				<span :class="{ [$style.lockedControl]: publishingLockedBy !== null }">
					<ElSwitch
						:model-value="publishingOn"
						:disabled="!canEdit || publishingLockedBy !== null"
						data-test-id="workflow-settings-publishing-approval-switch"
						@update:model-value="onPublishing"
					/>
				</span>
			</N8nTooltip>
		</ElCol>
	</ElRow>
	<ElRow v-if="showPromoting" data-test-id="workflow-settings-promoting-approval">
		<ElCol :span="10" :class="$style.label">
			{{ i18n.baseText('workflowReviews.enforcement.promoting.title') }}
		</ElCol>
		<ElCol :span="14">
			<N8nTooltip :disabled="promotingLockedBy === null" placement="top">
				<template #content>
					{{ lockTooltip(promotingLockedBy) }}
				</template>
				<span :class="{ [$style.lockedControl]: promotingLockedBy !== null }">
					<ElSwitch
						:model-value="promotingOn"
						:disabled="!canEdit || promotingLockedBy !== null"
						data-test-id="workflow-settings-promoting-approval-switch"
						@update:model-value="onPromoting"
					/>
				</span>
			</N8nTooltip>
		</ElCol>
	</ElRow>
</template>

<style module>
.label {
	display: flex;
	align-items: center;
}

.lockedControl {
	display: inline-flex;
}

.lockedControl > * {
	pointer-events: none;
}
</style>
