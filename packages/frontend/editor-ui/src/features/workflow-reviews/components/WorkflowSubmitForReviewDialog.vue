<script setup lang="ts">
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';

import { useToast } from '@/app/composables/useToast';
import { useReviewRequiredStore } from '@/features/workflow-reviews/reviewRequired.store';
import { createWorkflowReviewRequest } from '@/features/workflow-reviews/workflowReviews.api';

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
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const reviewRequiredStore = useReviewRequiredStore();

const reviewTitle = ref('');
const description = ref('');
const isSubmitting = ref(false);
const hasConflict = ref(false);
const existingReviewRequestId = ref<string>();
const titleInput = useTemplateRef<InstanceType<typeof N8nInput>>('titleInput');

const isSubmitDisabled = computed(
	() => isSubmitting.value || reviewTitle.value.trim().length === 0,
);

watch(
	() => props.open,
	(isOpen) => {
		if (!isOpen) return;

		reviewTitle.value = '';
		description.value = '';
		hasConflict.value = false;
		existingReviewRequestId.value = undefined;
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
	hasConflict.value = false;
	existingReviewRequestId.value = undefined;

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
		});

		// TODO(LIGO-838): authoritative open-review server state takes over the displayed toggle
		reviewRequiredStore.setReviewRequired(props.workflowId, false);
		emit('update:open', false);
		emit('submitted');
	} catch (error) {
		if (error instanceof ResponseError && error.httpStatusCode === 409) {
			hasConflict.value = true;
			const workflowReviewRequestId = error.meta?.workflowReviewRequestId;
			existingReviewRequestId.value =
				typeof workflowReviewRequestId === 'string' ? workflowReviewRequestId : undefined;
			// TODO(LIGO-806): link to the existing review and offer updating it to the current version
			return;
		}

		toast.showError(error, i18n.baseText('workflowReviews.submitForReview.error.title'));
	} finally {
		isSubmitting.value = false;
	}
};

// TODO(LIGO-600, LIGO-601): add Reviewer selection (N8nUserSelect) once eligible-reviewers + notify-list endpoints exist
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
			<N8nCallout v-if="hasConflict" theme="danger" data-test-id="workflow-review-conflict-error">
				{{ i18n.baseText('workflowReviews.submitForReview.error.conflict') }}
			</N8nCallout>

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
</style>
