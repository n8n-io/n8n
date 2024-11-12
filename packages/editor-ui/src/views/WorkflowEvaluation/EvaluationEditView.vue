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

const props = defineProps<{
	testId?: number;
}>();

const router = useRouter();
const route = useRoute();
const testId = props.testId ?? (route.params.testId as unknown as number);

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
} = useEvaluationForm(testId);

// Help texts
const helpText = computed(
	() => 'Executions with this tag will be added as test cases to this test.',
);
const workflowHelpText = computed(() => 'This workflow will be called once for each test case.');
const metricsHelpText = computed(
	() =>
		'The output field of the last node in the evaluation workflow. Metrics will be averaged across all test cases.',
);

onMounted(() => {
	void init();
});

async function onSaveTest() {
	try {
		await saveTest();
		toast.showMessage({ title: 'Test saved', type: 'success' });
		void router.push({ name: VIEWS.WORKFLOW_EVALUATION });
	} catch (e: unknown) {
		toast.showError(e, 'Failed to save test');
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
			:help-text="helpText"
		/>

		<WorkflowSelector v-model="state.evaluationWorkflow" :help-text="workflowHelpText" />

		<MetricsInput v-model="state.metrics" :help-text="metricsHelpText" />

		<div :class="$style.footer">
			<n8n-button
				type="primary"
				:label="isEditing ? 'Update Test' : 'Save Test'"
				:loading="isSaving"
				@click="onSaveTest"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	width: 383px;
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
