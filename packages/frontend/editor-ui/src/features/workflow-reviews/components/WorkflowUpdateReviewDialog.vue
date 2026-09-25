<script setup lang="ts">
import type { WorkflowReviewRequestForWorkflow } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';
import { I18nT } from 'vue-i18n';

import { useToast } from '@n8n/composables/useToast';
import CharacterCount from '@/app/components/CharacterCount.vue';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { useLatestFetch } from '@/app/composables/useLatestFetch';
import { useReviewVersionName } from '@/features/workflow-reviews/composables/useReviewVersionName';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '@/features/workflow-reviews/constants';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import { updateWorkflowReviewRequestVersion } from '@/features/workflow-reviews/workflowReviews.api';

const REVIEW_DESCRIPTION_MAX_LENGTH = 512;

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

const step = ref<1 | 2>(1);
const reviewDescription = ref('');
const prefilledReviewDescription = ref('');
const loadedReview = ref<WorkflowReviewRequestForWorkflow | null>(null);
const isLoadingReviewDescription = ref(false);
const isSubmitting = ref(false);
const workflowReviewRequestId = computed(
	() => loadedReview.value?.id ?? reviewStatusStore.openReviewRequest(props.workflowId)?.id,
);

const stepLabel = computed(() =>
	i18n.baseText('workflowReviews.submitForReview.step', {
		interpolate: { step: step.value, total: 2 },
	}),
);

const hasInvalidVersion = computed(() => !props.canSubmit || versionName.value.trim().length === 0);

// neither gate depends on the prefill succeeding, the review is re-resolved at submit time
const isNextDisabled = computed(() => hasInvalidVersion.value || isLoadingReviewDescription.value);

const isSubmitDisabled = computed(() => isSubmitting.value || hasInvalidVersion.value);

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

const { next: nextReviewLoad } = useLatestFetch();

const loadReviewDescription = async (workflowId: string) => {
	const isCurrent = nextReviewLoad();
	isLoadingReviewDescription.value = true;

	try {
		const openReviewRequest = await resolveOpenReviewRequest(workflowId);
		if (!isCurrent() || props.workflowId !== workflowId) return;
		// a missing review here must not close the dialog
		if (!openReviewRequest) return;

		loadedReview.value = openReviewRequest;
		reviewDescription.value = openReviewRequest.description ?? '';
		prefilledReviewDescription.value = reviewDescription.value;
	} catch (error) {
		if (!isCurrent() || props.workflowId !== workflowId) return;
		toast.showError(error, i18n.baseText('workflowReviews.updateReview.error.title'));
	} finally {
		if (isCurrent()) isLoadingReviewDescription.value = false;
	}
};

watch(
	() => [props.open, props.workflowId] as const,
	([isOpen, workflowId]) => {
		if (!isOpen) {
			nextReviewLoad();
			loadedReview.value = null;
			isLoadingReviewDescription.value = false;
			return;
		}

		step.value = 1;
		loadedReview.value = null;
		reviewDescription.value = '';
		prefilledReviewDescription.value = '';
		prefillVersionName();
		void loadReviewDescription(workflowId);
	},
);

const goToReviewStep = () => {
	if (isNextDisabled.value) return;
	step.value = 2;
};

const goBack = () => {
	if (isSubmitting.value) return;
	step.value = 1;
};

const submittedReviewDescription = (): string | undefined => {
	const trimmed = reviewDescription.value.trim();
	return trimmed === prefilledReviewDescription.value.trim() ? undefined : trimmed;
};

const handleFormSubmit = () => {
	if (step.value === 1) goToReviewStep();
	else void submit();
};

const submit = async () => {
	if (isSubmitDisabled.value) return;

	const workflowId = props.workflowId;

	// `flushSave()` awaits a full workflow save, so reading the fields afterwards
	// could send values the guard never validated.
	const trimmedVersionName = versionName.value.trim();
	const trimmedVersionDescription = submittedVersionDescription();
	const trimmedReviewDescription = submittedReviewDescription();

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

		// the dialog may have sat open across a long save, so re-resolve
		// rather than trusting the open-time snapshot.
		const reviewRequest = await resolveOpenReviewRequest(workflowId);
		if (props.workflowId !== workflowId) return;

		if (!reviewRequest) {
			toast.showError(
				new Error(i18n.baseText('workflowReviews.updateReview.error.noOpenReview')),
				i18n.baseText('workflowReviews.updateReview.error.title'),
			);
			emit('update:open', false);
			return;
		}
		loadedReview.value = reviewRequest;

		if (
			reviewRequest.workflowVersionId === workflowVersionId &&
			trimmedReviewDescription === undefined
		) {
			emit('update:open', false);
			return;
		}

		await updateWorkflowReviewRequestVersion(rootStore.restApiContext, reviewRequest.id, {
			workflowId,
			workflowVersionId,
			workflowVersionName: trimmedVersionName,
			workflowVersionDescription: trimmedVersionDescription,
			description: trimmedReviewDescription,
		});
		if (props.workflowId !== workflowId) return;

		applyVersionMetadata(workflowVersionId, trimmedVersionName, trimmedVersionDescription);

		void reviewStatusStore.fetchStatus(workflowId);
		emit('update:open', false);
		emit('updated', reviewRequest.id);
	} catch (error) {
		// Whatever went wrong (e.g. the review closed concurrently), refetch the
		// review state — and adopt it, so a retry can't reuse the dead request id.
		await reviewStatusStore.fetchStatus(workflowId);
		if (props.workflowId === workflowId) {
			loadedReview.value = reviewStatusStore.openReviewRequest(workflowId);
		}
		toast.showError(error, i18n.baseText('workflowReviews.updateReview.error.title'));
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<N8nDialog :open="open" size="medium" @update:open="close">
		<N8nDialogHeader>
			<N8nText
				:class="$style.step"
				size="xsmall"
				color="text-light"
				bold
				tag="p"
				data-test-id="workflow-update-review-dialog-step"
			>
				{{ stepLabel }}
			</N8nText>
			<N8nDialogTitle>{{ i18n.baseText('workflowReviews.updateReview.title') }}</N8nDialogTitle>
		</N8nDialogHeader>
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
		<form
			:class="$style.form"
			data-test-id="workflow-update-review-dialog"
			@submit.prevent="handleFormSubmit"
		>
			<WorkflowVersionForm
				v-if="step === 1"
				v-model:version-name="versionName"
				v-model:description="versionDescription"
				:disabled="isSubmitting"
				version-name-test-id="workflow-update-review-version-name-input"
				description-test-id="workflow-update-review-version-description-input"
				@submit="goToReviewStep"
			/>
			<N8nInputLabel
				v-else
				input-name="workflow-update-review-description"
				:label="i18n.baseText('workflowReviews.submitForReview.description.label')"
			>
				<N8nInput
					id="workflow-update-review-description"
					v-model="reviewDescription"
					type="textarea"
					:rows="3"
					:maxlength="REVIEW_DESCRIPTION_MAX_LENGTH"
					:disabled="isSubmitting"
					data-test-id="workflow-update-review-description-input"
				/>
				<CharacterCount
					:value="reviewDescription"
					:max="REVIEW_DESCRIPTION_MAX_LENGTH"
					data-test-id="workflow-update-review-description-character-count"
				/>
			</N8nInputLabel>
			<N8nDialogFooter>
				<template v-if="step === 1">
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
						type="submit"
						:loading="isLoadingReviewDescription"
						:disabled="isNextDisabled"
						data-test-id="workflow-update-review-next-button"
					>
						{{ i18n.baseText('generic.next') }}
					</N8nButton>
				</template>
				<template v-else>
					<N8nButton
						type="button"
						variant="outline"
						:disabled="isSubmitting"
						data-test-id="workflow-update-review-back-button"
						@click="goBack"
					>
						{{ i18n.baseText('generic.back') }}
					</N8nButton>
					<N8nButton
						type="submit"
						:loading="isSubmitting"
						:disabled="isSubmitDisabled"
						data-test-id="workflow-update-review-submit-button"
					>
						{{ i18n.baseText('workflowReviews.updateReview.submit') }}
					</N8nButton>
				</template>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
.description {
	display: block;
	margin-top: var(--spacing--xs);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	margin-top: var(--spacing--sm);
}

.step {
	margin: 0;
	text-transform: uppercase;
	letter-spacing: var(--letter-spacing--wide);
}
</style>
