<script setup lang="ts">
import type { WorkflowReviewEligibleReviewer } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nUserSelect,
	type IUser,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';

import { useToast } from '@/app/composables/useToast';
import { useReviewRequiredStore } from '@/features/workflow-reviews/reviewRequired.store';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import {
	createWorkflowReviewRequest,
	fetchEligibleReviewers,
} from '@/features/workflow-reviews/workflowReviews.api';

const REVIEW_TITLE_MAX_LENGTH = 128;
const REVIEW_DESCRIPTION_MAX_LENGTH = 512;

const props = defineProps<{
	open: boolean;
	workflowId: string;
	flushSave: () => Promise<string | undefined>;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	submitted: [];
	conflict: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const reviewRequiredStore = useReviewRequiredStore();
const reviewStatusStore = useWorkflowReviewStatusStore();

const reviewTitle = ref('');
const description = ref('');
const isSubmitting = ref(false);
const selectedReviewerId = ref('');
const eligibleReviewers = ref<WorkflowReviewEligibleReviewer[]>([]);
const isLoadingReviewers = ref(false);
const titleInput = useTemplateRef<InstanceType<typeof N8nInput>>('titleInput');

const isSubmitDisabled = computed(
	() => isSubmitting.value || reviewTitle.value.trim().length === 0,
);

const reviewerOptions = computed<IUser[]>(() =>
	eligibleReviewers.value.map((reviewer) => ({
		...reviewer,
		fullName: [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') || undefined,
	})),
);

const loadEligibleReviewers = async () => {
	isLoadingReviewers.value = true;
	try {
		const { data } = await fetchEligibleReviewers(rootStore.restApiContext, {
			workflowId: props.workflowId,
		});
		eligibleReviewers.value = data;
	} catch {
		eligibleReviewers.value = [];
	} finally {
		isLoadingReviewers.value = false;
	}
};

watch(
	() => props.open,
	(isOpen) => {
		if (!isOpen) return;

		reviewTitle.value = '';
		description.value = '';
		selectedReviewerId.value = '';
		eligibleReviewers.value = [];
		void loadEligibleReviewers();
	},
);

const close = () => {
	if (isSubmitting.value) return;
	emit('update:open', false);
};

const handleOpenAutoFocus = (event: Event) => {
	event.preventDefault();
	void nextTick(() => titleInput.value?.focus());
};

const submit = async () => {
	if (isSubmitDisabled.value) return;

	isSubmitting.value = true;

	try {
		const workflowVersionId = await props.flushSave();
		if (!workflowVersionId) {
			toast.showError(
				new Error(i18n.baseText('workflowReviews.submitForReview.error.save')),
				i18n.baseText('workflowReviews.submitForReview.error.title'),
			);
			return;
		}

		const trimmedDescription = description.value.trim();
		await createWorkflowReviewRequest(rootStore.restApiContext, {
			title: reviewTitle.value.trim(),
			description: trimmedDescription || undefined,
			workflows: [{ workflowId: props.workflowId, workflowVersionId }],
			reviewerUserIds: selectedReviewerId.value ? [selectedReviewerId.value] : undefined,
		});

		reviewRequiredStore.setReviewRequired(props.workflowId, false);
		void reviewStatusStore.fetchStatus(props.workflowId);
		emit('update:open', false);
		emit('submitted');
	} catch (error) {
		if (error instanceof ResponseError && error.httpStatusCode === 409) {
			// The conflict proves an open review this client didn't know about — lock
			// immediately and hand off to the update-review dialog.
			void reviewStatusStore.fetchStatus(props.workflowId);
			emit('update:open', false);
			emit('conflict');
			return;
		}

		toast.showError(error, i18n.baseText('workflowReviews.submitForReview.error.title'));
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('workflowReviews.submitForReview.title')"
		:aria-description="i18n.baseText('workflowReviews.submitForReview.ariaDescription')"
		@open-auto-focus="handleOpenAutoFocus"
		@update:open="close"
	>
		<form
			data-test-id="workflow-submit-for-review-dialog"
			:class="$style.form"
			@submit.prevent="submit"
		>
			<N8nInputLabel
				input-name="workflow-review-title"
				:label="i18n.baseText('workflowReviews.submitForReview.reviewTitle.label')"
				required
			>
				<N8nInput
					id="workflow-review-title"
					ref="titleInput"
					v-model="reviewTitle"
					:maxlength="REVIEW_TITLE_MAX_LENGTH"
					data-test-id="workflow-review-title-input"
				/>
			</N8nInputLabel>
			<N8nInputLabel
				input-name="workflow-review-description"
				:label="i18n.baseText('workflowReviews.submitForReview.description.label')"
			>
				<N8nInput
					id="workflow-review-description"
					v-model="description"
					type="textarea"
					:rows="3"
					:maxlength="REVIEW_DESCRIPTION_MAX_LENGTH"
					data-test-id="workflow-review-description-input"
				/>
			</N8nInputLabel>
			<hr :class="$style.divider" />
			<N8nInputLabel
				input-name="workflow-review-reviewer"
				:label="i18n.baseText('workflowReviews.submitForReview.reviewer.label')"
			>
				<N8nUserSelect
					id="workflow-review-reviewer"
					v-model="selectedReviewerId"
					:users="reviewerOptions"
					:loading="isLoadingReviewers"
					:placeholder="i18n.baseText('workflowReviews.submitForReview.reviewer.placeholder')"
					:teleported="false"
					clearable
					data-test-id="workflow-review-reviewer-select"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nUserSelect>
			</N8nInputLabel>
			<N8nDialogFooter>
				<N8nButton
					type="button"
					variant="outline"
					:disabled="isSubmitting"
					data-test-id="workflow-review-cancel-button"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					type="submit"
					:loading="isSubmitting"
					:disabled="isSubmitDisabled"
					data-test-id="workflow-review-submit-button"
				>
					{{ i18n.baseText('workflowReviews.submitForReview.submit') }}
				</N8nButton>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}

.divider {
	width: 100%;
	margin: 0;
	border: none;
	border-top: var(--border);
}
</style>
