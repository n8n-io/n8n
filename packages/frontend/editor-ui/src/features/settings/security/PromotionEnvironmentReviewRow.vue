<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { N8nCheckbox, N8nFormInput, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import {
	isNewVariant,
	reviewPrototypeState,
} from '@/features/workflow-reviews/reviewPrototype.state';

type CreateBranchLabelKey =
	| 'settings.promotions.environment.form.createBranch.git'
	| 'settings.promotions.environment.form.createBranch.gitlab';

const props = defineProps<{
	createBranchOnPromotion?: boolean;
	/** Present only when this environment already has the branch checkbox. */
	createBranchLabelKey?: CreateBranchLabelKey;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:createBranchOnPromotion': [value: boolean];
	active: [value: boolean];
}>();

const i18n = useI18n();

/** Kept while the field is hidden. The environment save never reads it. */
const promotionBranchName = ref('');

const reviewsOn = computed(() => reviewPrototypeState.promotionReviewsEnabled);
const instanceRequired = computed(() => reviewPrototypeState.promotingNeedsApproval);
const projectRequired = computed(() => reviewPrototypeState.projectPromoting);

/** New shows this sequence only while promotion reviews are on. Off uses the top-level checkbox. */
const showSequence = computed(() => isNewVariant.value && reviewsOn.value);

const tooltipKey = computed(() => {
	if (instanceRequired.value) return 'workflowReviews.enforcement.lockedByInstance' as const;
	if (projectRequired.value) return 'workflowReviews.enforcement.lockedByProject' as const;
	return null;
});

const locked = computed(() => tooltipKey.value !== null);

const approvalOn = computed(() => {
	if (!reviewsOn.value) return false;
	if (instanceRequired.value || projectRequired.value) return true;
	return reviewPrototypeState.environmentPromoting;
});

/** Local choice. Only written when no higher policy locks the checkbox. */
const environmentApproval = computed({
	get: () => reviewPrototypeState.environmentPromoting,
	set: (value: boolean) => {
		if (locked.value || props.disabled) return;
		reviewPrototypeState.environmentPromoting = value;
	},
});

const createBranchDescriptionKey = computed(() =>
	props.createBranchLabelKey === 'settings.promotions.environment.form.createBranch.gitlab'
		? ('settings.promotions.environment.form.createBranch.gitlab.description' as const)
		: ('settings.promotions.environment.form.createBranch.git.description' as const),
);

function onCreateBranch(value: boolean | 'indeterminate') {
	emit('update:createBranchOnPromotion', value === true);
}

watch(showSequence, (active) => emit('active', active), { immediate: true });
onBeforeUnmount(() => emit('active', false));
</script>

<template>
	<div
		v-if="showSequence"
		:class="$style.sequence"
		data-test-id="promotion-environment-review-approval"
	>
		<N8nTooltip v-if="tooltipKey" placement="top">
			<template #content>
				{{ i18n.baseText(tooltipKey) }}
			</template>
			<span :class="$style.lockedControl">
				<N8nCheckbox
					:model-value="approvalOn"
					disabled
					data-test-id="promotion-environment-review-approval-checkbox"
				>
					<template #label>
						{{ i18n.baseText('settings.promotions.environment.reviewApproval.label') }}
						<N8nText :class="$style.hint" size="small" color="text-light">
							{{ i18n.baseText('settings.promotions.environment.reviewApproval.description') }}
						</N8nText>
					</template>
				</N8nCheckbox>
			</span>
		</N8nTooltip>
		<N8nCheckbox
			v-else
			v-model="environmentApproval"
			:disabled="disabled"
			data-test-id="promotion-environment-review-approval-checkbox"
		>
			<template #label>
				{{ i18n.baseText('settings.promotions.environment.reviewApproval.label') }}
				<N8nText :class="$style.hint" size="small" color="text-light">
					{{ i18n.baseText('settings.promotions.environment.reviewApproval.description') }}
				</N8nText>
			</template>
		</N8nCheckbox>
		<div v-if="approvalOn && createBranchLabelKey" :class="$style.nested">
			<N8nCheckbox
				:model-value="createBranchOnPromotion"
				:disabled="disabled"
				data-test-id="promotion-environment-create-branch"
				@update:model-value="onCreateBranch"
			>
				<template #label>
					{{ i18n.baseText(createBranchLabelKey) }}
					<N8nText :class="$style.hint" size="small" color="text-light">
						{{ i18n.baseText(createBranchDescriptionKey) }}
					</N8nText>
				</template>
			</N8nCheckbox>
			<div v-if="createBranchOnPromotion" :class="$style.nested">
				<N8nFormInput
					v-model="promotionBranchName"
					:label="i18n.baseText('settings.promotions.environment.reviewApproval.branchName')"
					:placeholder="
						i18n.baseText('settings.promotions.environment.reviewApproval.branchName.placeholder')
					"
					:show-required-asterisk="false"
					:disabled="disabled"
					data-test-id="promotion-environment-promotion-branch-name"
				/>
			</div>
		</div>
	</div>
</template>

<style module>
.sequence {
	display: flex;
	flex-direction: column;
	/* Same gap as the fields on this form, measured from a helper to the next control. */
	gap: var(--spacing--md);
}

.nested {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	/* Checkbox is 16px, then --spacing--2xs to its label. --spacing--lg is that sum. */
	margin-left: var(--spacing--lg);
}

.lockedControl {
	display: inline-flex;
	cursor: not-allowed;
}

.lockedControl > * {
	pointer-events: none;
}

.hint {
	display: block;
	margin-top: var(--spacing--2xs);
	line-height: var(--line-height--md);
}
</style>
