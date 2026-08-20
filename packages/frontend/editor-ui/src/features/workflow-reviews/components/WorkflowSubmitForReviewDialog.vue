<script setup lang="ts">
import { type WorkflowReviewEligibleReviewer } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nText,
	N8nUserSelect,
	type IUser,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';

import { useToast } from '@n8n/composables/useToast';
import CharacterCount from '@/app/components/CharacterCount.vue';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { useReviewVersionName } from '@/features/workflow-reviews/composables/useReviewVersionName';
import { formatUserDisplayName } from '@/features/workflow-reviews/workflowReviews.utils';
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
	submitted: [workflowReviewRequestId: string];
	conflict: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const reviewRequiredStore = useReviewRequiredStore();
const reviewStatusStore = useWorkflowReviewStatusStore();
const {
	versionName,
	versionDescription,
	prefillVersionName,
	submittedVersionDescription,
	applyVersionMetadata,
} = useReviewVersionName();

const step = ref<1 | 2>(1);
const reviewTitle = ref('');
const description = ref('');
const isSubmitting = ref(false);
const selectedReviewerId = ref('');
const eligibleReviewers = ref<WorkflowReviewEligibleReviewer[]>([]);
const isLoadingReviewers = ref(false);
const titleInput = useTemplateRef<InstanceType<typeof N8nInput>>('titleInput');
const versionForm = useTemplateRef<InstanceType<typeof WorkflowVersionForm>>('versionForm');

const stepLabel = computed(() =>
	i18n.baseText('workflowReviews.submitForReview.step', {
		interpolate: { step: step.value, total: 2 },
	}),
);

const isNextDisabled = computed(() => versionName.value.trim().length === 0);

const isSubmitDisabled = computed(
	() =>
		isSubmitting.value ||
		reviewTitle.value.trim().length === 0 ||
		selectedReviewerId.value.length === 0,
);

const reviewerOptions = computed<IUser[]>(() =>
	eligibleReviewers.value.map((reviewer) => ({
		...reviewer,
		fullName: formatUserDisplayName(reviewer) || undefined,
	})),
);

let loadReviewersSequence = 0;

const loadEligibleReviewers = async () => {
	const sequence = ++loadReviewersSequence;
	isLoadingReviewers.value = true;
	try {
		const { data } = await fetchEligibleReviewers(rootStore.restApiContext, {
			workflowId: props.workflowId,
		});
		if (sequence !== loadReviewersSequence) return;
		eligibleReviewers.value = data;
	} catch {
		if (sequence !== loadReviewersSequence) return;
		eligibleReviewers.value = [];
	} finally {
		if (sequence === loadReviewersSequence) isLoadingReviewers.value = false;
	}
};

watch(
	() => props.open,
	(isOpen) => {
		if (!isOpen) return;

		step.value = 1;
		reviewTitle.value = '';
		description.value = '';
		selectedReviewerId.value = '';
		eligibleReviewers.value = [];
		prefillVersionName();
		void loadEligibleReviewers();
	},
);

const close = () => {
	if (isSubmitting.value) return;
	emit('update:open', false);
};

const handleOpenAutoFocus = (event: Event) => {
	event.preventDefault();
	void nextTick(() => versionForm.value?.focusInput());
};

const goToReviewStep = () => {
	if (isNextDisabled.value) return;
	step.value = 2;
	void nextTick(() => titleInput.value?.focus());
};

const goBack = () => {
	if (isSubmitting.value) return;
	step.value = 1;
};

const handleFormSubmit = () => {
	if (step.value === 1) {
		goToReviewStep();
	} else {
		void submit();
	}
};

const submit = async () => {
	if (isSubmitDisabled.value || versionName.value.trim().length === 0) return;

	const workflowId = props.workflowId;
	// `flushSave()` awaits a full workflow save, so reading the fields afterwards
	// could submit values the guard never validated.
	const trimmedVersionName = versionName.value.trim();
	const trimmedVersionDescription = submittedVersionDescription();
	const trimmedTitle = reviewTitle.value.trim();
	const trimmedDescription = description.value.trim();
	const reviewerId = selectedReviewerId.value;

	isSubmitting.value = true;

	try {
		const workflowVersionId = await props.flushSave();

		// Navigated away while saving: flushSave reads the version of the workflow
		// that is open now, so pairing it with the pinned id would mismatch.
		if (props.workflowId !== workflowId) return;

		if (!workflowVersionId) {
			toast.showError(
				new Error(i18n.baseText('workflowReviews.submitForReview.error.save')),
				i18n.baseText('workflowReviews.submitForReview.error.title'),
			);
			return;
		}

		const reviewRequest = await createWorkflowReviewRequest(rootStore.restApiContext, {
			title: trimmedTitle,
			description: trimmedDescription || undefined,
			workflows: [
				{
					workflowId,
					workflowVersionId,
					workflowVersionName: trimmedVersionName,
					workflowVersionDescription: trimmedVersionDescription,
				},
			],
			reviewerUserIds: [reviewerId],
		});

		// Navigated away mid-flight: the review belongs to a workflow this dialog no
		// longer targets, and writing it here would corrupt the current one's status.
		if (props.workflowId !== workflowId) return;

		applyVersionMetadata(workflowVersionId, trimmedVersionName, trimmedVersionDescription);

		// install the response before clearing the local flag so the
		// publish gate never opens while a refetch is in flight
		reviewStatusStore.setOpenReview(workflowId, reviewRequest, trimmedDescription || null);
		reviewRequiredStore.setReviewRequired(workflowId, false);
		emit('update:open', false);
		emit('submitted', reviewRequest.id);
	} catch (error) {
		if (error instanceof ResponseError && error.httpStatusCode === 409) {
			// The conflict proves an open review this client didn't know about — lock
			// immediately and hand off to the update-review dialog.
			void reviewStatusStore.fetchStatus(workflowId);

			// Navigated away mid-flight: the conflict belongs to the pinned workflow,
			// so the update-review dialog must not open for the current one.
			if (props.workflowId !== workflowId) return;

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
		:aria-description="i18n.baseText('workflowReviews.submitForReview.ariaDescription')"
		@open-auto-focus="handleOpenAutoFocus"
		@update:open="close"
	>
		<N8nDialogHeader>
			<N8nText
				:class="$style.step"
				size="xsmall"
				color="text-light"
				bold
				tag="p"
				data-test-id="workflow-review-dialog-step"
			>
				{{ stepLabel }}
			</N8nText>
			<N8nDialogTitle>{{ i18n.baseText('workflowReviews.submitForReview.title') }}</N8nDialogTitle>
		</N8nDialogHeader>
		<form
			data-test-id="workflow-submit-for-review-dialog"
			:class="$style.form"
			@submit.prevent="handleFormSubmit"
		>
			<WorkflowVersionForm
				v-if="step === 1"
				ref="versionForm"
				v-model:version-name="versionName"
				v-model:description="versionDescription"
				version-name-test-id="workflow-review-version-name-input"
				description-test-id="workflow-review-version-description-input"
				@submit="goToReviewStep"
			/>
			<template v-else>
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
						:disabled="isSubmitting"
						data-test-id="workflow-review-title-input"
					/>
					<CharacterCount
						:value="reviewTitle"
						:max="REVIEW_TITLE_MAX_LENGTH"
						data-test-id="workflow-review-title-character-count"
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
						:disabled="isSubmitting"
						data-test-id="workflow-review-description-input"
					/>
					<CharacterCount
						:value="description"
						:max="REVIEW_DESCRIPTION_MAX_LENGTH"
						data-test-id="workflow-review-description-character-count"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					input-name="workflow-review-reviewer"
					:label="i18n.baseText('workflowReviews.submitForReview.reviewer.label')"
					required
				>
					<N8nUserSelect
						id="workflow-review-reviewer"
						v-model="selectedReviewerId"
						:users="reviewerOptions"
						:loading="isLoadingReviewers"
						:placeholder="i18n.baseText('workflowReviews.submitForReview.reviewer.placeholder')"
						:teleported="false"
						:disabled="isSubmitting"
						clearable
						data-test-id="workflow-review-reviewer-select"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nUserSelect>
				</N8nInputLabel>
			</template>
			<N8nDialogFooter>
				<template v-if="step === 1">
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
						:disabled="isNextDisabled"
						data-test-id="workflow-review-next-button"
					>
						{{ i18n.baseText('generic.next') }}
					</N8nButton>
				</template>
				<template v-else>
					<N8nButton
						type="button"
						variant="outline"
						:disabled="isSubmitting"
						data-test-id="workflow-review-back-button"
						@click="goBack"
					>
						{{ i18n.baseText('generic.back') }}
					</N8nButton>
					<N8nButton
						type="submit"
						:loading="isSubmitting"
						:disabled="isSubmitDisabled"
						data-test-id="workflow-review-submit-button"
					>
						{{ i18n.baseText('workflowReviews.submitForReview.submit') }}
					</N8nButton>
				</template>
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

.step {
	margin: 0;
	text-transform: uppercase;
	letter-spacing: var(--letter-spacing--wide);
}
</style>
