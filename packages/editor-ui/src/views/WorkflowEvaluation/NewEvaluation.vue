<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useEvaluationForm } from './composables/useEvaluationForm';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
	testId?: number;
}>();

const router = useRouter();
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
	updateMetrics,
	onTagUpdate,
	onWorkflowUpdate,
} = useEvaluationForm(props.testId);

// Help texts
const helpText = computed(
	() => 'Executions with this tag will be added as test cases to this test.',
);
const workflowHelpText = computed(() => 'This workflow will be called once for each test case.');
const metricsHelpText = computed(
	() =>
		'The output field of the last node in the evaluation workflow. Metrics will be averaged across all test cases.',
);

function getTagName(tagId: string) {
	return tagsById.value[tagId]?.name ?? '';
}

onMounted(() => {
	void init();
});

// Utility functions specific to the UI
function addNewMetric() {
	updateMetrics([...state.value.metrics, '']);
}

function updateMetric(index: number, value: string) {
	const newMetrics = [...state.value.metrics];
	newMetrics[index] = value;
	updateMetrics(newMetrics);
}

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
		<div :class="$style.header">
			<n8n-icon-button
				icon="arrow-left"
				:class="$style.backButton"
				type="tertiary"
				:title="$locale.baseText('common.back')"
				@click="$router.back()"
			/>
			<h2 :class="$style.title">
				<template v-if="!state.name.isEditing">
					{{ state.name.value }}
					<n8n-icon-button
						:class="$style.editInputButton"
						icon="pen"
						type="tertiary"
						@click="startEditing('name')"
					/>
				</template>
				<N8nInput
					v-else
					ref="nameInput"
					v-model="state.name.tempValue"
					type="text"
					:placeholder="$locale.baseText('common.name')"
					@blur="() => saveChanges('name')"
					@keydown="(e) => handleKeydown(e, 'name')"
				/>
			</h2>
		</div>

		<!-- Description -->
		<div :class="[$style.formGroup, $style.metrics]">
			<n8n-input-label label="Description" :bold="false" size="small" :class="$style.metricField">
				<N8nInput
					v-model="state.description"
					type="textarea"
					:placeholder="'Enter evaluation description'"
				/>
			</n8n-input-label>
		</div>
		<!-- Tags -->
		<div :class="$style.formGroup">
			<n8n-input-label label="Tag name" :bold="false" size="small">
				<div v-if="!state.tags.isEditing" :class="$style.tagsRead" @click="startEditing('tags')">
					<n8n-text v-if="state.tags.appliedTagIds.length === 0" size="small"
						>Select tag...</n8n-text
					>
					<n8n-tag
						v-for="tagId in state.tags.appliedTagIds"
						:key="tagId"
						:text="getTagName(tagId)"
					/>
					<n8n-icon-button
						:class="$style.editInputButton"
						icon="pen"
						type="tertiary"
						size="small"
						transparent
					/>
				</div>
				<TagsDropdown
					v-else
					ref="tagsInput"
					:model-value="state.tags.appliedTagIds"
					:placeholder="$locale.baseText('executionAnnotationView.chooseOrCreateATag')"
					:create-enabled="false"
					:all-tags="allTags"
					:is-loading="isLoading"
					:tags-by-id="tagsById"
					class="tags-edit"
					data-test-id="workflow-tags-dropdown"
					@update:model-value="onTagUpdate"
					@esc="cancelEditing('tags')"
					@blur="saveChanges('tags')"
				/>
			</n8n-input-label>
			<n8n-text size="small" color="text-light">{{ helpText }}</n8n-text>
		</div>

		<!-- Evaluation Workflow -->
		<div :class="$style.formGroup">
			<n8n-input-label label="Evaluation workflow" :bold="false" size="small">
				<WorkflowSelectorParameterInput
					ref="workflowInput"
					:parameter="{
						displayName: 'Workflow',
						name: 'workflowId',
						type: 'workflowSelector',
						default: '',
					}"
					:model-value="state.evaluationWorkflow"
					:display-title="'Evaluation Workflow'"
					:is-value-expression="false"
					:expression-edit-dialog-visible="false"
					:path="'workflows'"
					allow-new
					@update:model-value="onWorkflowUpdate"
				/>
			</n8n-input-label>
			<n8n-text size="small" color="text-light">
				{{ workflowHelpText }}
			</n8n-text>
		</div>

		<!-- Metrics -->
		<div :class="[$style.formGroup, $style.metrics]">
			<n8n-text color="text-dark"> Metrics </n8n-text>
			<hr :class="$style.metricsDivider" />
			<n8n-text size="small" color="text-light">
				{{ metricsHelpText }}
			</n8n-text>
			<n8n-input-label
				label="Output field(s)"
				:bold="false"
				size="small"
				:class="$style.metricField"
			>
				<div :class="$style.metricsContainer">
					<div v-for="(metric, index) in state.metrics" :key="index">
						<N8nInput
							:ref="`metric_${index}`"
							:model-value="metric"
							:placeholder="'Enter metric name'"
							@update:model-value="(value: string) => updateMetric(index, value)"
						/>
					</div>
					<n8n-button
						type="tertiary"
						:label="'New metric'"
						:class="$style.newMetricButton"
						@click="addNewMetric"
					/>
				</div>
			</n8n-input-label>
		</div>

		<!-- Save Test Button -->
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
	// border-top-color: transparent;
	// border-left-color: transparent;
	background: var(--color-background-xlight);
	// Pin the container to the left
	margin-right: auto;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	margin-bottom: var(--spacing-l);

	&:hover {
		.editInputButton {
			opacity: 1;
		}
	}
}

.title {
	margin: 0;
	flex-grow: 1;
	font-size: var(--font-size-l);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-dark);
}

.formGroup {
	margin-bottom: var(--spacing-l);

	:global(.n8n-input-label) {
		margin-bottom: var(--spacing-2xs);
	}
}

.readOnlyField {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-2xs) var(--spacing-xs);
	background-color: var(--color-background-light);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-small);
}

.metricsContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.metricField {
	width: 100%;
	margin-top: var(--spacing-xs);
}

.metricsDivider {
	margin-top: var(--spacing-4xs);
	margin-bottom: var(--spacing-3xs);
}

.newMetricButton {
	align-self: flex-start;
	margin-top: var(--spacing-2xs);
	width: 100%;
	background-color: var(--color-sticky-code-background);
	border-color: var(--color-button-secondary-focus-outline);
	color: var(--color-button-secondary-font);
}

.footer {
	margin-top: var(--spacing-xl);
	display: flex;
	justify-content: flex-start;
}
.tagsRead {
	&:hover .editInputButton {
		opacity: 1;
	}
}
.editInputButton {
	opacity: 0;
	border: none;
	--button-font-color: var(--prim-gray-490);
}
.backButton {
	border: none;
	--button-font-color: var(--color-text-light);
}
</style>
