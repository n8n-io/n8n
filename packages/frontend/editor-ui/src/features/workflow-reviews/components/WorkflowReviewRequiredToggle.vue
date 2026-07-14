<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nLink, N8nSwitch2, N8nText } from '@n8n/design-system';
import type { WorkflowReviewRequiredStatus } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import {
	fetchWorkflowReviewRequiredStatus,
	updateWorkflowReviewRequired,
} from '@n8n/rest-api-client/api/workflows';
import { useWorkflowReviewsEnabled } from '@/features/workflow-reviews/composables/useWorkflowReviewsEnabled';

const WORKFLOW_REVIEWS_DOCS_URL = 'https://docs.n8n.io/governance/workflow-reviews/';

const props = defineProps<{
	workflowId: string;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const { isWorkflowReviewsEnabled } = useWorkflowReviewsEnabled();

const workflowDocumentStore = computed(() =>
	useWorkflowDocumentStore(createWorkflowDocumentId(props.workflowId)),
);

const status = ref<WorkflowReviewRequiredStatus | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);

const reviewRequired = computed(() => status.value?.reviewRequired ?? false);
const canEdit = computed(() => status.value?.canEdit ?? false);

async function loadStatus() {
	if (!isWorkflowReviewsEnabled.value) {
		status.value = null;
		isLoading.value = false;
		return;
	}

	isLoading.value = true;
	try {
		status.value = await fetchWorkflowReviewRequiredStatus(
			rootStore.restApiContext,
			props.workflowId,
		);
	} catch {
		status.value = null;
	} finally {
		isLoading.value = false;
	}
}

async function onToggle(nextValue: boolean) {
	if (!canEdit.value || isSaving.value) return;

	isSaving.value = true;
	try {
		status.value = await updateWorkflowReviewRequired(
			rootStore.restApiContext,
			props.workflowId,
			nextValue,
		);
		workflowDocumentStore.value.mergeSettings({ reviewRequired: nextValue });
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowReviews.reviewRequired.error'));
	} finally {
		isSaving.value = false;
	}
}

watch(
	() => [props.workflowId, isWorkflowReviewsEnabled.value] as const,
	() => {
		void loadStatus();
	},
	{ immediate: true },
);
</script>

<template>
	<div
		v-if="!isLoading && status !== null"
		:class="$style.container"
		data-test-id="workflow-review-required-toggle"
		@click.stop
	>
		<div :class="$style.header">
			<N8nText :bold="true" size="small">
				{{ i18n.baseText('workflowReviews.reviewRequired.title') }}
			</N8nText>
			<N8nSwitch2
				:model-value="reviewRequired"
				:disabled="!canEdit || isSaving"
				size="small"
				:aria-label="i18n.baseText('workflowReviews.reviewRequired.title')"
				data-test-id="workflow-review-required-switch"
				@update:model-value="onToggle"
				@click.stop
			/>
		</div>
		<N8nText size="small" color="text-light" :class="$style.description">
			{{ i18n.baseText('workflowReviews.reviewRequired.description') }}
			<N8nLink :href="WORKFLOW_REVIEWS_DOCS_URL" new-window size="small">
				{{ i18n.baseText('generic.learnMore') }}
			</N8nLink>
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border-top: var(--border);
	min-width: var(--spacing--4xl);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.description {
	display: inline;
}
</style>
