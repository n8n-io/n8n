<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { SourceControlledFile } from '@n8n/api-types';
import {
	N8nButton,
	N8nInput,
	N8nInputLabel,
	N8nLoading,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { SOURCE_CONTROL_CREATE_REVIEW_MODAL_KEY } from '../sourceControl.constants';
import { useSourceControlStore } from '../sourceControl.store';

const props = defineProps<{
	data: {
		onCreated?: (prNumber: number) => void;
	};
}>();

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const sourceControlStore = useSourceControlStore();

const isLoadingCandidates = ref(true);
const isSubmitting = ref(false);
const candidates = ref<SourceControlledFile[]>([]);
const selectedWorkflowIds = ref<string[]>([]);
const title = ref('');
const body = ref('');

const workflowOptions = computed(() =>
	candidates.value.map((workflow) => ({
		value: workflow.id,
		label: workflow.name,
	})),
);

const canSubmit = computed(
	() => selectedWorkflowIds.value.length > 0 && !isSubmitting.value && !isLoadingCandidates.value,
);

const loadCandidates = async () => {
	isLoadingCandidates.value = true;
	try {
		candidates.value = await sourceControlStore.getReviewCandidates();
	} catch (error) {
		toast.showError(error, i18n.baseText('sourceControl.reviews.create.loadCandidatesError'));
	} finally {
		isLoadingCandidates.value = false;
	}
};

const closeModal = () => {
	uiStore.closeModal(SOURCE_CONTROL_CREATE_REVIEW_MODAL_KEY);
};

const onSubmit = async () => {
	if (!canSubmit.value) return;

	isSubmitting.value = true;
	try {
		const review = await sourceControlStore.createReviewRequest({
			workflowIds: selectedWorkflowIds.value,
			title: title.value.trim() || undefined,
			body: body.value.trim() || undefined,
		});
		toast.showMessage({
			title: i18n.baseText('sourceControl.reviews.create.success.title'),
			type: 'success',
		});
		closeModal();
		props.data.onCreated?.(review.prNumber);
	} catch (error) {
		toast.showError(error, i18n.baseText('sourceControl.reviews.create.error'));
	} finally {
		isSubmitting.value = false;
	}
};

onMounted(loadCandidates);
</script>

<template>
	<Modal
		:name="SOURCE_CONTROL_CREATE_REVIEW_MODAL_KEY"
		:title="i18n.baseText('sourceControl.reviews.create.title')"
		:subtitle="i18n.baseText('sourceControl.reviews.create.subtitle')"
		width="520px"
		:scrollable="true"
		data-test-id="create-review-request-modal"
	>
		<template #content>
			<N8nLoading v-if="isLoadingCandidates" :rows="3" />

			<template v-else>
				<N8nNotice
					v-if="candidates.length === 0"
					:content="i18n.baseText('sourceControl.reviews.create.noCandidates')"
					data-test-id="create-review-no-candidates"
				/>

				<template v-else>
					<N8nInputLabel
						:label="i18n.baseText('sourceControl.reviews.create.workflows.label')"
						:bold="false"
						size="small"
						color="text-base"
						:class="$style.field"
					>
						<N8nSelect
							v-model="selectedWorkflowIds"
							multiple
							filterable
							size="medium"
							:placeholder="i18n.baseText('sourceControl.reviews.create.workflows.placeholder')"
							data-test-id="create-review-workflows-select"
						>
							<N8nOption
								v-for="option in workflowOptions"
								:key="option.value"
								:value="option.value"
								:label="option.label"
							/>
						</N8nSelect>
					</N8nInputLabel>

					<N8nInputLabel
						:label="i18n.baseText('sourceControl.reviews.create.titleField.label')"
						:bold="false"
						size="small"
						color="text-base"
						:class="$style.field"
					>
						<N8nInput
							v-model="title"
							:placeholder="i18n.baseText('sourceControl.reviews.create.titleField.placeholder')"
							data-test-id="create-review-title-input"
						/>
						<N8nText size="small" color="text-light" :class="$style.hint">
							{{ i18n.baseText('sourceControl.reviews.create.titleField.hint') }}
						</N8nText>
					</N8nInputLabel>

					<N8nInputLabel
						:label="i18n.baseText('sourceControl.reviews.create.description.label')"
						:bold="false"
						size="small"
						color="text-base"
						:class="$style.field"
					>
						<N8nInput
							v-model="body"
							type="textarea"
							:rows="3"
							:placeholder="i18n.baseText('sourceControl.reviews.create.description.placeholder')"
							data-test-id="create-review-description-input"
						/>
					</N8nInputLabel>
				</template>
			</template>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="outline" data-test-id="create-review-cancel" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					:disabled="!canSubmit || candidates.length === 0"
					:loading="isSubmitting"
					data-test-id="create-review-submit"
					@click="onSubmit"
				>
					{{ i18n.baseText('sourceControl.reviews.create.submit') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--sm);
}

.hint {
	margin-top: var(--spacing--4xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	width: 100%;
}
</style>
