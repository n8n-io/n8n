<script setup lang="ts">
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nLink,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';
import { I18nT } from 'vue-i18n';

import { useToast } from '@n8n/composables/useToast';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { useReviewVersionName } from '@/features/workflow-reviews/composables/useReviewVersionName';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '@/features/workflow-reviews/constants';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import { updateWorkflowReviewRequestVersion } from '@/features/workflow-reviews/workflowReviews.api';

const props = withDefaults(
	defineProps<{
		open: boolean;
		workflowId: string;
		flushSave: () => Promise<string | undefined>;
		canSubmit?: boolean;
	}>(),
	{ canSubmit: true },
);

const emit = defineEmits<{
	'update:open': [value: boolean];
	updated: [workflowReviewRequestId: string];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const reviewStatusStore = useWorkflowReviewStatusStore();
const {
	versionName,
	versionDescription,
	prefillVersionName,
	submittedVersionDescription,
	applyVersionMetadata,
} = useReviewVersionName();

const isSubmitting = ref(false);
const workflowReviewRequestId = computed(
	() => reviewStatusStore.openReviewRequest(props.workflowId)?.id,
);

const isSubmitDisabled = computed(
	() => isSubmitting.value || !props.canSubmit || versionName.value.trim().length === 0,
);

watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) prefillVersionName();
	},
);

const close = () => {
	if (isSubmitting.value) return;
	emit('update:open', false);
};

/** The open review may have been closed elsewhere in the meantime — refetch once before giving up. */
const resolveOpenReviewRequest = async (workflowId: string) => {
	let request = reviewStatusStore.openReviewRequest(workflowId);
	if (!request) {
		await reviewStatusStore.fetchStatus(workflowId);
		request = reviewStatusStore.openReviewRequest(workflowId);
	}
	return request;
};

const submit = async () => {
	if (isSubmitDisabled.value) return;

	const workflowId = props.workflowId;
	// `flushSave()` awaits a full workflow save, so reading the fields afterwards
	// could send values the guard never validated.
	const trimmedVersionName = versionName.value.trim();
	const trimmedVersionDescription = submittedVersionDescription();

	isSubmitting.value = true;
	try {
		const workflowVersionId = await props.flushSave();

		// Navigated away while saving: flushSave reads the version of the workflow
		// that is open now, so pairing it with the pinned id would mismatch.
		if (props.workflowId !== workflowId) return;

		if (!workflowVersionId) {
			toast.showError(
				new Error(i18n.baseText('workflowReviews.submitForReview.error.save')),
				i18n.baseText('workflowReviews.updateReview.error.title'),
			);
			return;
		}

		const openReviewRequest = await resolveOpenReviewRequest(workflowId);
		if (!openReviewRequest) {
			toast.showError(
				new Error(i18n.baseText('workflowReviews.updateReview.error.noOpenReview')),
				i18n.baseText('workflowReviews.updateReview.error.title'),
			);
			emit('update:open', false);
			return;
		}
		if (openReviewRequest.workflowVersionId === workflowVersionId) {
			emit('update:open', false);
			return;
		}

		await updateWorkflowReviewRequestVersion(rootStore.restApiContext, openReviewRequest.id, {
			workflowId,
			workflowVersionId,
			workflowVersionName: trimmedVersionName,
			workflowVersionDescription: trimmedVersionDescription,
		});

		applyVersionMetadata(workflowVersionId, trimmedVersionName, trimmedVersionDescription);

		void reviewStatusStore.fetchStatus(workflowId);
		emit('update:open', false);
		emit('updated', openReviewRequest.id);
	} catch (error) {
		// Whatever went wrong (e.g. the review closed concurrently), refetch the review state.
		void reviewStatusStore.fetchStatus(workflowId);
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
			<I18nT keypath="workflowReviews.updateReview.description" tag="span" scope="global">
				<!-- the id is undefined until fetchStatus resolves (409 path), so the
					label must render unlinked rather than leaving an empty slot. -->
				<template #review>
					<N8nLink
						v-if="workflowReviewRequestId"
						:to="{
							name: WORKFLOW_REVIEW_REQUESTS_VIEW,
							params: { reviewRequestId: workflowReviewRequestId },
						}"
					>
						{{ i18n.baseText('workflowReviews.updateReview.description.review') }}
					</N8nLink>
					<span v-else>
						{{ i18n.baseText('workflowReviews.updateReview.description.review') }}
					</span>
				</template>
			</I18nT>
		</N8nDialogDescription>
		<WorkflowVersionForm
			v-model:version-name="versionName"
			v-model:description="versionDescription"
			:class="$style.versionForm"
			:disabled="isSubmitting"
			version-name-test-id="workflow-update-review-version-name-input"
			description-test-id="workflow-update-review-version-description-input"
			@submit="submit"
		/>
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
				:disabled="isSubmitDisabled"
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

.versionForm {
	margin-top: var(--spacing--sm);
}
</style>
