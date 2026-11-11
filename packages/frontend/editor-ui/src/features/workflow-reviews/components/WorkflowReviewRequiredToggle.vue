<script setup lang="ts">
import { computed, watch } from 'vue';
import { N8nDropdownMenuItem, N8nIcon, N8nSwitch, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { ReviewRequirementLock } from '@n8n/api-types';

import { useWorkflowReviewsFeature } from '@/features/workflow-reviews/composables/useWorkflowReviewsFeature';
import { reviewPrototypeState } from '@/features/workflow-reviews/reviewPrototype.state';
import { useWorkflowReviewPolicyStore } from '@/features/workflow-reviews/workflowReviewPolicy.store';

const props = defineProps<{
	workflowId: string;
	canEdit: boolean;
}>();

const i18n = useI18n();
const settingsStore = useSettingsStore();
const policyStore = useWorkflowReviewPolicyStore();
const { isWorkflowReviewsEnabled, isPromotionReviewsEnabled } = useWorkflowReviewsFeature();

const showPublishing = computed(() => isWorkflowReviewsEnabled.value);
const showPromoting = computed(() => isPromotionReviewsEnabled.value);

const instancePublishing = computed(
	() => settingsStore.settings.workflowReviews?.publishingNeedsApproval === true,
);
const instancePromoting = computed(
	() => settingsStore.settings.workflowReviews?.promotingNeedsApproval === true,
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

const lockTooltips = {
	publishing: {
		instance: 'workflowReviews.approvalMenu.publishing.lockedBy.instance',
		project: 'workflowReviews.approvalMenu.publishing.lockedBy.project',
	},
	promoting: {
		instance: 'workflowReviews.approvalMenu.promoting.lockedBy.instance',
		project: 'workflowReviews.approvalMenu.promoting.lockedBy.project',
	},
} satisfies Record<'publishing' | 'promoting', Record<ReviewRequirementLock, BaseTextKey>>;

function lockTooltip(
	kind: 'publishing' | 'promoting',
	lockedBy: ReviewRequirementLock | null,
): string {
	if (!lockedBy) return '';
	return i18n.baseText(lockTooltips[kind][lockedBy]);
}

watch(
	[publishingOn, promotingOn, publishingLockedBy, promotingLockedBy],
	() => {
		policyStore.set(props.workflowId, {
			publishingNeedsApproval: publishingOn.value,
			promotingNeedsApproval: promotingOn.value,
			publishingLockedBy: publishingLockedBy.value,
			promotingLockedBy: promotingLockedBy.value,
		});
	},
	{ immediate: true },
);

function togglePublishing() {
	if (!props.canEdit || publishingLockedBy.value) return;
	reviewPrototypeState.workflowPublishing[props.workflowId] = !publishingOn.value;
}

function togglePromoting() {
	if (!props.canEdit || promotingLockedBy.value) return;
	reviewPrototypeState.workflowPromoting[props.workflowId] = !promotingOn.value;
}
</script>

<template>
	<div data-test-id="workflow-review-approval-menu">
		<N8nTooltip v-if="showPublishing" :disabled="!publishingLockedBy" placement="left">
			<template #content>
				{{ lockTooltip('publishing', publishingLockedBy) }}
			</template>
			<N8nDropdownMenuItem
				id="publishing-needs-approval"
				:label="i18n.baseText('workflowReviews.enforcement.publishing.title')"
				:checked="publishingOn"
				checkbox
				:close-on-select="false"
				:disabled="!canEdit || publishingLockedBy !== null"
				divided
				test-id="workflow-review-publishing-approval"
				@select="togglePublishing"
			>
				<template #item-label="{ ui }">
					<N8nText size="small" :class="ui.class">
						{{ i18n.baseText('workflowReviews.enforcement.publishing.title') }}
					</N8nText>
				</template>
				<template #item-trailing="{ ui }">
					<span :class="$style.trailing">
						<N8nIcon v-if="publishingLockedBy" icon="lock" size="small" />
						<N8nSwitch
							:model-value="publishingOn"
							:disabled="!canEdit || publishingLockedBy !== null"
							aria-hidden="true"
							tabindex="-1"
							data-test-id="workflow-review-publishing-approval-switch"
							:class="[ui.class, $style.switch]"
						/>
					</span>
				</template>
			</N8nDropdownMenuItem>
		</N8nTooltip>
		<N8nTooltip v-if="showPromoting" :disabled="!promotingLockedBy" placement="left">
			<template #content>
				{{ lockTooltip('promoting', promotingLockedBy) }}
			</template>
			<N8nDropdownMenuItem
				id="promoting-needs-approval"
				:label="i18n.baseText('workflowReviews.enforcement.promoting.title')"
				:checked="promotingOn"
				checkbox
				:close-on-select="false"
				:disabled="!canEdit || promotingLockedBy !== null"
				:divided="!showPublishing"
				test-id="workflow-review-promoting-approval"
				@select="togglePromoting"
			>
				<template #item-label="{ ui }">
					<N8nText size="small" :class="ui.class">
						{{ i18n.baseText('workflowReviews.enforcement.promoting.title') }}
					</N8nText>
				</template>
				<template #item-trailing="{ ui }">
					<span :class="$style.trailing">
						<N8nIcon v-if="promotingLockedBy" icon="lock" size="small" />
						<N8nSwitch
							:model-value="promotingOn"
							:disabled="!canEdit || promotingLockedBy !== null"
							aria-hidden="true"
							tabindex="-1"
							data-test-id="workflow-review-promoting-approval-switch"
							:class="[ui.class, $style.switch]"
						/>
					</span>
				</template>
			</N8nDropdownMenuItem>
		</N8nTooltip>
	</div>
</template>

<style module>
.trailing {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.switch {
	pointer-events: none;
}
</style>
