<script lang="ts" setup>
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { useToast } from '@/app/composables/useToast';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { GITHUB_REVIEW_MODEL } from '@/features/promotions/constants';
import { usePromotionsStore } from '@/features/promotions/promotions.store';
import { useWorkflowReviewsFeature } from '@/features/workflow-reviews/composables/useWorkflowReviewsFeature';
import {
	createWorkflowReviewRequest,
	fetchWorkflowReviewRequests,
} from '@/features/workflow-reviews/workflowReviews.api';

const props = defineProps<{
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const promotionsStore = usePromotionsStore();
const workflowsListStore = useWorkflowsListStore();
const { isWorkflowReviewsEnabled } = useWorkflowReviewsFeature();

/** The instance's configured environment branch is the sensible default. */
const DEFAULT_BRANCH = 'master';

const workflows = ref<Array<{ id: string; name: string }>>([]);
const loadingWorkflows = ref(false);
const selectedWorkflowId = ref('');
const baseBranch = ref(DEFAULT_BRANCH);
const submitting = ref(false);

const isSubmitDisabled = computed(
	() => submitting.value || !selectedWorkflowId.value || baseBranch.value.trim().length === 0,
);

watch(
	() => props.open,
	async (open) => {
		if (!open) return;
		selectedWorkflowId.value = '';
		// Prefer the branch this instance is configured to sync with.
		baseBranch.value = promotionsStore.config?.githubBranch || DEFAULT_BRANCH;
		loadingWorkflows.value = true;
		try {
			const page = await workflowsListStore.fetchWorkflowsPage(undefined, 1, 200, 'updatedAt:desc');
			workflows.value = page.map(({ id, name }) => ({ id, name }));
		} catch (error) {
			toast.showError(error, i18n.baseText('promotions.new.error.workflows'));
		} finally {
			loadingWorkflows.value = false;
		}
	},
);

/**
 * Open (or reuse) a workflow review for the pinned version. Approving that
 * review is what marks the promotion ready — see GithubReviewDetail. Returns
 * the review id, or null when the reviews feature is unavailable.
 */
async function ensureLinkedReview(workflowId: string, workflowVersionId: string): Promise<string> {
	try {
		const review = await createWorkflowReviewRequest(rootStore.restApiContext, {
			title: i18n.baseText('promotions.new.reviewTitle', {
				interpolate: { workflow: workflowLabel(workflowId) },
			}),
			workflows: [{ workflowId, workflowVersionId }],
		});
		return review.id;
	} catch (error) {
		// One open review per workflow: reuse the existing one instead of failing.
		if (error instanceof ResponseError && error.httpStatusCode === 409) {
			const { data } = await fetchWorkflowReviewRequests(rootStore.restApiContext, {
				workflowId,
				state: 'open',
				take: 1,
			});
			if (data[0]) return data[0].id;
		}
		throw error;
	}
}

function workflowLabel(workflowId: string): string {
	return workflows.value.find((workflow) => workflow.id === workflowId)?.name ?? workflowId;
}

async function onSubmit() {
	submitting.value = true;
	try {
		const workflow = await workflowsListStore.fetchWorkflow(selectedWorkflowId.value);

		const options: Record<string, unknown> = { baseBranch: baseBranch.value.trim() };

		if (isWorkflowReviewsEnabled.value) {
			try {
				options.localReviewId = await ensureLinkedReview(workflow.id, workflow.versionId);
			} catch (error) {
				// Don't block the promotion if the review couldn't be attached — the
				// source can still mark it ready manually.
				toast.showError(error, i18n.baseText('promotions.new.reviewWarning'));
			}
		}

		const promotion = await promotionsStore.create({
			model: GITHUB_REVIEW_MODEL,
			unitOfWork: { type: 'workflow', id: workflow.id },
			options,
		});
		toast.showMessage({
			title: i18n.baseText('promotions.new.toast', {
				interpolate: { number: String(promotion.metadata.prNumber ?? '') },
			}),
			type: 'success',
		});
		emit('update:open', false);
	} catch (error) {
		toast.showError(error, i18n.baseText('promotions.new.error.submit'));
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:header="i18n.baseText('promotions.new.title')"
		data-test-id="new-promotion-dialog"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.body">
			<N8nText color="text-light" size="small">
				{{ i18n.baseText('promotions.new.description') }}
			</N8nText>

			<N8nInputLabel :label="i18n.baseText('promotions.new.workflow')" required>
				<N8nSelect
					v-model="selectedWorkflowId"
					:loading="loadingWorkflows"
					:placeholder="i18n.baseText('promotions.new.workflow.placeholder')"
					filterable
					data-test-id="new-promotion-workflow-select"
				>
					<N8nOption
						v-for="workflow in workflows"
						:key="workflow.id"
						:value="workflow.id"
						:label="workflow.name"
					/>
				</N8nSelect>
			</N8nInputLabel>

			<N8nInputLabel :label="i18n.baseText('promotions.new.baseBranch')" required>
				<N8nInput
					v-model="baseBranch"
					:placeholder="DEFAULT_BRANCH"
					data-test-id="new-promotion-base-branch"
				/>
			</N8nInputLabel>

			<N8nCallout v-if="isWorkflowReviewsEnabled" theme="info">
				{{ i18n.baseText('promotions.new.reviewNote') }}
			</N8nCallout>

			<N8nDialogFooter>
				<N8nButton
					type="secondary"
					:label="i18n.baseText('promotions.new.cancel')"
					@click="emit('update:open', false)"
				/>
				<N8nButton
					:label="i18n.baseText('promotions.new.submit')"
					:disabled="isSubmitDisabled"
					:loading="submitting"
					data-test-id="new-promotion-submit"
					@click="onSubmit"
				/>
			</N8nDialogFooter>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
