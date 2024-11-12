<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useToast } from '@/composables/useToast';
import EvaluationHeader from '@/components/WorkflowEvaluation/EditEvaluation/EvaluationHeader.vue';
import DescriptionInput from '@/components/WorkflowEvaluation/EditEvaluation/DescriptionInput.vue';
import TagsInput from '@/components/WorkflowEvaluation/EditEvaluation/TagsInput.vue';
import WorkflowSelector from '@/components/WorkflowEvaluation/EditEvaluation/WorkflowSelector.vue';
import MetricsInput from '@/components/WorkflowEvaluation/EditEvaluation/MetricsInput.vue';
import { useEvaluationForm } from '@/components/WorkflowEvaluation/composables/useEvaluationForm';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{
	testId?: number;
}>();

const router = useRouter();
const route = useRoute();
const locale = useI18n();
const testId = computed(() => props.testId ?? (route.params.testId as unknown as number));
const buttonLabel = computed(() =>
	isEditing.value
		? locale.baseText('workflowEvaluation.edit.updateTest')
		: locale.baseText('workflowEvaluation.edit.saveTest'),
);
const toast = useToast();
const {
	state,
	isEditing,
	isLoading,
	isSaving,
	allTags,
	tagsById,
	init,
	saveTest,
	startEditing,
	saveChanges,
	cancelEditing,
	handleKeydown,
} = useEvaluationForm(testId.value);

onMounted(() => {
	void init();
});

async function onSaveTest() {
	try {
		await saveTest();
		toast.showMessage({
			title: locale.baseText('workflowEvaluation.edit.testSaved'),
			type: 'success',
		});
		void router.push({ name: VIEWS.WORKFLOW_EVALUATION });
	} catch (e: unknown) {
		toast.showError(e, locale.baseText('workflowEvaluation.edit.testSaveFailed'));
	}
}
</script>

<template>
	<div :class="$style.container">
		<EvaluationHeader
			v-model="state.name"
			:start-editing="startEditing"
			:save-changes="saveChanges"
			:handle-keydown="handleKeydown"
		/>

		<DescriptionInput v-model="state.description" />

		<TagsInput
			v-model="state.tags"
			:all-tags="allTags"
			:tags-by-id="tagsById"
			:is-loading="isLoading"
			:start-editing="startEditing"
			:save-changes="saveChanges"
			:cancel-editing="cancelEditing"
		/>

		<WorkflowSelector v-model="state.evaluationWorkflow" />

		<MetricsInput v-model="state.metrics" />

		<div :class="$style.footer">
			<n8n-button type="primary" :label="buttonLabel" :loading="isSaving" @click="onSaveTest" />
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	width: var(--evaluation-edit-panel-width, 24rem);
	height: 100%;
	padding: var(--spacing-s);
	border-right: 1px solid var(--color-foreground-base);
	background: var(--color-background-xlight);
	margin-right: auto;
}

.footer {
	margin-top: var(--spacing-xl);
	display: flex;
	justify-content: flex-start;
}
</style>
