<script setup lang="ts">
import { useRootStore } from '@n8n/stores/useRootStore';
import { N8nButton, N8nDialog, N8nDialogDescription, N8nDialogFooter } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

import { useToast } from '@/app/composables/useToast';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import { updateWorkflowReviewRequestVersion } from '@/features/workflow-reviews/workflowReviews.api';

const props = defineProps<{
	open: boolean;
	workflowId: string;
	flushSave: () => Promise<string | undefined>;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	updated: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const reviewStatusStore = useWorkflowReviewStatusStore();

const isSubmitting = ref(false);

const close = () => {
	if (isSubmitting.value) return;
	emit('update:open', false);
};

/** The open review may have been closed elsewhere in the meantime — refetch once before giving up. */
const resolveOpenReviewRequestId = async (): Promise<string | undefined> => {
	let request = reviewStatusStore.openReviewRequest(props.workflowId);
	if (!request) {
		await reviewStatusStore.fetchStatus(props.workflowId);
		request = reviewStatusStore.openReviewRequest(props.workflowId);
	}
	return request?.id;
};

const submit = async () => {
	if (isSubmitting.value) return;

	isSubmitting.value = true;
	try {
		const workflowVersionId = await props.flushSave();
		if (!workflowVersionId) {
			toast.showError(
				new Error(i18n.baseText('workflowReviews.submitForReview.error.save')),
				i18n.baseText('workflowReviews.updateReview.error.title'),
			);
			return;
		}

		const workflowReviewRequestId = await resolveOpenReviewRequestId();
		if (!workflowReviewRequestId) {
			toast.showError(
				new Error(i18n.baseText('workflowReviews.updateReview.error.noOpenReview')),
				i18n.baseText('workflowReviews.updateReview.error.title'),
			);
			emit('update:open', false);
			return;
		}

		await updateWorkflowReviewRequestVersion(rootStore.restApiContext, workflowReviewRequestId, {
			workflowId: props.workflowId,
			workflowVersionId,
		});

		void reviewStatusStore.fetchStatus(props.workflowId);
		emit('update:open', false);
		emit('updated');
	} catch (error) {
		// Whatever went wrong (e.g. the review closed concurrently), refetch the review state.
		void reviewStatusStore.fetchStatus(props.workflowId);
		toast.showError(error, i18n.baseText('workflowReviews.updateReview.error.title'));
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('workflowReviews.updateReview.title')"
		@update:open="close"
	>
		<N8nDialogDescription :class="$style.description">
			{{ i18n.baseText('workflowReviews.updateReview.description') }}
		</N8nDialogDescription>
		<N8nDialogFooter data-test-id="workflow-update-review-dialog">
			<N8nButton
				type="button"
				variant="outline"
				:disabled="isSubmitting"
				data-test-id="workflow-update-review-cancel-button"
				@click="close"
			>
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton
				type="button"
				:loading="isSubmitting"
				:disabled="isSubmitting"
				data-test-id="workflow-update-review-submit-button"
				@click="submit"
			>
				{{ i18n.baseText('workflowReviews.updateReview.submit') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.description {
	display: block;
	margin-top: var(--spacing--xs);
}
</style>
