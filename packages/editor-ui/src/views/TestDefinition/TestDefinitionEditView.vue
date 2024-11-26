<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import { useDebounce } from '@/composables/useDebounce';
import { useTestDefinitionForm } from '@/components/TestDefinition/composables/useTestDefinitionForm';

import EvaluationHeader from '@/components/TestDefinition/EditDefinition/EvaluationHeader.vue';
import DescriptionInput from '@/components/TestDefinition/EditDefinition/DescriptionInput.vue';
import EvaluationStep from '@/components/TestDefinition/EditDefinition/EvaluationStep.vue';
import TagsInput from '@/components/TestDefinition/EditDefinition/TagsInput.vue';
import WorkflowSelector from '@/components/TestDefinition/EditDefinition/WorkflowSelector.vue';
import MetricsInput from '@/components/TestDefinition/EditDefinition/MetricsInput.vue';

const props = defineProps<{
	testId?: string;
}>();

const router = useRouter();
const route = useRoute();
const locale = useI18n();
const { debounce } = useDebounce();
const toast = useToast();
const { isLoading, allTags, tagsById, fetchAll } = useAnnotationTagsStore();

const testId = computed(() => props.testId ?? (route.params.testId as string));
const currentWorkflowId = computed(() => route.params.name as string);
const buttonLabel = computed(() =>
	testId.value
		? locale.baseText('testDefinition.edit.updateTest')
		: locale.baseText('testDefinition.edit.saveTest'),
);

const {
	state,
	fieldsIssues,
	isSaving,
	loadTestData,
	createTest,
	updateTest,
	startEditing,
	saveChanges,
	cancelEditing,
	handleKeydown,
} = useTestDefinitionForm();

onMounted(async () => {
	await fetchAll();
	if (testId.value) {
		await loadTestData(testId.value);
	} else {
		await onSaveTest();
	}
});

async function onSaveTest() {
	try {
		let savedTest;
		if (testId.value) {
			savedTest = await updateTest(testId.value);
		} else {
			savedTest = await createTest(currentWorkflowId.value);
		}
		if (savedTest && route.name === VIEWS.TEST_DEFINITION_EDIT) {
			await router.replace({
				name: VIEWS.TEST_DEFINITION_EDIT,
				params: { testId: savedTest.id },
			});
		}
		toast.showMessage({
			title: locale.baseText('testDefinition.edit.testSaved'),
			type: 'success',
		});
	} catch (e: unknown) {
		toast.showError(e, locale.baseText('testDefinition.edit.testSaveFailed'));
	}
}

function hasIssues(key: string) {
	return fieldsIssues.value.some((issue) => issue.field === key);
}

watch(() => state.value, debounce(onSaveTest, { debounceTime: 400 }), { deep: true });
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.content">
			<EvaluationHeader
				v-model="state.name"
				:class="{ 'has-issues': hasIssues('name') }"
				:start-editing="startEditing"
				:save-changes="saveChanges"
				:handle-keydown="handleKeydown"
			/>

			<EvaluationStep
				:class="$style.step"
				:title="locale.baseText('testDefinition.edit.description')"
				:expanded="false"
			>
				<template #icon><font-awesome-icon icon="thumbtack" size="lg" /></template>
				<template #cardContent>
					<DescriptionInput v-model="state.description" />
				</template>
			</EvaluationStep>

			<div :class="$style.panelIntro">{{ locale.baseText('testDefinition.edit.step.intro') }}</div>
			<BlockArrow :class="$style.introArrow" />
			<div :class="$style.panelBlock">
				<EvaluationStep
					:class="$style.step"
					:title="locale.baseText('testDefinition.edit.step.executions')"
				>
					<template #icon><font-awesome-icon icon="history" size="lg" /></template>
					<template #cardContent>
						<TagsInput
							v-model="state.tags"
							:class="{ 'has-issues': hasIssues('tags') }"
							:all-tags="allTags"
							:tags-by-id="tagsById"
							:is-loading="isLoading"
							:start-editing="startEditing"
							:save-changes="saveChanges"
							:cancel-editing="cancelEditing"
						/>
					</template>
				</EvaluationStep>
				<div :class="$style.evaluationArrows">
					<BlockArrow />
					<BlockArrow />
				</div>
				<EvaluationStep
					:class="$style.step"
					:title="locale.baseText('testDefinition.edit.step.nodes')"
					:small="true"
					:expanded="false"
				>
					<template #icon><font-awesome-icon icon="thumbtack" size="lg" /></template>
					<template #cardContent>{{
						locale.baseText('testDefinition.edit.step.mockedNodes', { adjustToNumber: 0 })
					}}</template>
				</EvaluationStep>

				<EvaluationStep
					:class="$style.step"
					:title="locale.baseText('testDefinition.edit.step.reRunExecutions')"
					:small="true"
				>
					<template #icon><font-awesome-icon icon="redo" size="lg" /></template>
				</EvaluationStep>

				<EvaluationStep
					:class="$style.step"
					:title="locale.baseText('testDefinition.edit.step.compareExecutions')"
				>
					<template #icon><font-awesome-icon icon="equals" size="lg" /></template>
					<template #cardContent>
						<WorkflowSelector
							v-model="state.evaluationWorkflow"
							:class="{ 'has-issues': hasIssues('evaluationWorkflow') }"
						/>
					</template>
				</EvaluationStep>

				<EvaluationStep
					:class="$style.step"
					:title="locale.baseText('testDefinition.edit.step.metrics')"
				>
					<template #icon><font-awesome-icon icon="chart-bar" size="lg" /></template>
					<template #cardContent>
						<MetricsInput v-model="state.metrics" :class="{ 'has-issues': hasIssues('metrics') }" />
					</template>
				</EvaluationStep>
			</div>

			<div :class="$style.footer">
				<n8n-button
					type="primary"
					data-test-id="run-test-button"
					:label="buttonLabel"
					:loading="isSaving"
					@click="onSaveTest"
				/>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	width: 100%;
	height: 100%;
	padding: var(--spacing-s);
	display: grid;
	grid-template-columns: minmax(auto, 24rem) 1fr;
	gap: var(--spacing-2xl);
}

.content {
	min-width: 0;
	width: 100%;
}

.panelBlock {
	max-width: var(--evaluation-edit-panel-width, 24rem);
	display: grid;

	justify-items: end;
}
.panelIntro {
	font-size: var(--font-size-m);
	color: var(--color-text-dark);
	margin-top: var(--spacing-s);
	justify-self: center;
	position: relative;
	display: block;
}
.step {
	position: relative;

	&:not(:first-child) {
		margin-top: var(--spacing-m);
	}
}
.introArrow {
	--arrow-height: 1.5rem;
	justify-self: center;
}
.evaluationArrows {
	--arrow-height: 11rem;
	display: flex;
	justify-content: space-between;
	width: 100%;
	max-width: 80%;
	margin: 0 auto;
	margin-bottom: -100%;
	z-index: 0;
}
.footer {
	margin-top: var(--spacing-xl);
	display: flex;
	justify-content: flex-start;
}

.workflow {
	padding: var(--spacing-l);
	background-color: var(--color-background-light);
	border-radius: var(--border-radius-large);
	border: var(--border-base);
}

.workflowSteps {
	display: grid;
	gap: var(--spacing-2xs);
	max-width: 42rem;
	margin: 0 auto;
}

.sideBySide {
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	gap: var(--spacing-2xs);
	justify-items: end;
	align-items: start;
}
</style>
