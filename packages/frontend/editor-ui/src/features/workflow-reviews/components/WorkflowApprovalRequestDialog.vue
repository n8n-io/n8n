<script setup lang="ts">
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nText,
	N8nUserSelect,
	type IUser,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';
import type { WorkflowReviewEligibleReviewer } from '@n8n/api-types';

import { useToast } from '@n8n/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useDependencies } from '@/app/composables/useDependencies';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { generateVersionLabelFromId } from '@/features/workflows/workflowHistory/utils';
import { formatUserDisplayName } from '@/features/workflow-reviews/workflowReviews.utils';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import {
	createWorkflowReviewRequest,
	fetchEligibleReviewers,
} from '@/features/workflow-reviews/workflowReviews.api';

const REVIEW_TITLE_MAX_LENGTH = 128;
const REVIEW_DESCRIPTION_MAX_LENGTH = 512;

const props = defineProps<{
	open: boolean;
	intent: 'publish' | 'promote';
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
const reviewStatusStore = useWorkflowReviewStatusStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const { fetchDependencyCounts, getTotalCount } = useDependencies();

const reviewTitle = ref('');
const description = ref('');
const selectedReviewerId = ref('');
const eligibleReviewers = ref<WorkflowReviewEligibleReviewer[]>([]);
const isSubmitting = ref(false);
const isLoadingReviewers = ref(false);

const title = computed(() =>
	i18n.baseText(
		props.intent === 'promote'
			? 'workflowReviews.approvalRequest.promote.title'
			: 'workflowReviews.approvalRequest.publish.title',
	),
);

const dependencyCount = computed(() => getTotalCount(props.workflowId, 'workflow'));

const dependencyLabel = computed(() =>
	i18n.baseText('workflowReviews.approvalRequest.dependencies', {
		adjustToNumber: dependencyCount.value,
		interpolate: { count: dependencyCount.value },
	}),
);

const reviewerOptions = computed<IUser[]>(() =>
	eligibleReviewers.value.map((reviewer) => ({
		...reviewer,
		fullName: formatUserDisplayName(reviewer) || undefined,
	})),
);

const canSubmit = computed(
	() =>
		!isSubmitting.value &&
		reviewTitle.value.trim().length > 0 &&
		description.value.trim().length > 0 &&
		selectedReviewerId.value.length > 0,
);

let loadReviewersSequence = 0;

async function loadEligibleReviewers() {
	const sequence = ++loadReviewersSequence;
	isLoadingReviewers.value = true;
	try {
		const { data } = await fetchEligibleReviewers(rootStore.restApiContext, {
			workflowId: props.workflowId,
		});
		if (sequence !== loadReviewersSequence) return;
		eligibleReviewers.value = data;
	} catch (error) {
		if (sequence !== loadReviewersSequence) return;
		eligibleReviewers.value = [];
		toast.showError(error, i18n.baseText('workflowReviews.submitForReview.error.loadReviewers'));
	} finally {
		if (sequence === loadReviewersSequence) isLoadingReviewers.value = false;
	}
}

watch(
	() => props.open,
	(isOpen) => {
		if (!isOpen) {
			loadReviewersSequence++;
			reviewTitle.value = '';
			description.value = '';
			selectedReviewerId.value = '';
			return;
		}
		void loadEligibleReviewers();
		void fetchDependencyCounts([props.workflowId], 'workflow');
	},
);

function close() {
	emit('update:open', false);
}

function submit() {
	emit('update:open', false);
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		data-test-id="workflow-review-approval-dialog"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :class="$style.field">
				<N8nInputLabel :label="i18n.baseText('workflowReviews.submitForReview.reviewTitle.label')">
					<N8nInput
						v-model="reviewTitle"
						:maxlength="REVIEW_TITLE_MAX_LENGTH"
						data-test-id="workflow-review-approval-title"
					/>
				</N8nInputLabel>
				<N8nText v-if="dependencyCount > 0" size="small" color="text-light">
					{{ dependencyLabel }}
					·
					<N8nLink
						:to="{ name: VIEWS.WORKFLOW_HISTORY, params: { workflowId } }"
						size="small"
						data-test-id="workflow-review-compare-changes"
					>
						{{ i18n.baseText('workflowReviews.approvalRequest.compareChanges') }}
					</N8nLink>
				</N8nText>
			</div>
			<div :class="$style.field">
				<N8nInputLabel :label="i18n.baseText('workflowReviews.approvalRequest.description')">
					<N8nInput
						v-model="description"
						type="textarea"
						:rows="4"
						:maxlength="REVIEW_DESCRIPTION_MAX_LENGTH"
						data-test-id="workflow-review-approval-description"
					/>
				</N8nInputLabel>
			</div>
			<div :class="$style.field">
				<N8nInputLabel :label="i18n.baseText('workflowReviews.submitForReview.reviewer.label')">
					<N8nUserSelect
						v-model="selectedReviewerId"
						:users="reviewerOptions"
						:loading="isLoadingReviewers"
						:teleported="false"
						:placeholder="i18n.baseText('workflowReviews.approvalRequest.reviewer.placeholder')"
						data-test-id="workflow-review-approval-reviewer"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nUserSelect>
				</N8nInputLabel>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="outline" data-test-id="workflow-review-approval-cancel" @click="close">
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton variant="primary" data-test-id="workflow-review-approval-submit" @click="submit">
				{{ i18n.baseText('workflowReviews.submitForReview.submit') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module>
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.field + .field {
	margin-top: var(--spacing--sm);
}
</style>
