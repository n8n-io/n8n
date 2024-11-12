<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import { ref, computed, useTemplateRef, nextTick } from 'vue';
import type AnnotationTagsDropdownEe from '@/components/AnnotationTagsDropdown.ee.vue';
import WorkflowSelectorParameterInput from '@/components/WorkflowSelectorParameterInput/WorkflowSelectorParameterInput.vue';
import { createEventBus, N8nInput } from 'n8n-design-system';
import type { INodeParameterResourceLocator } from 'n8n-workflow';
import { useAnnotationTagsStore } from '@/stores/tags.store';

const tagsEventBus = createEventBus();
const isPanelExpanded = ref(true);
const name = ref('My Test');
const tempName = ref('');
const isNameEditing = ref(false);
const description = ref('');
const tempDescription = ref('');
const isDescriptionEditing = ref(false);
const appliedTagIds = ref<string[]>([]);
const isTagsEditing = ref(false);
const metrics = ref<string[]>(['']);
const evaluationWorkflow = ref<INodeParameterResourceLocator>({
	mode: 'list',
	value: '',
	__rl: true,
});

const helpText = computed(
	() => 'Executions with this tag will be added as test cases to this test.',
);
const workflowHelpText = computed(() => 'This workflow will be called once for each test case.');
const metricsHelpText = computed(
	() =>
		'The output field of the last node in the evaluation workflow. Metrics will be averaged across all test cases.',
);

const containerStyle = computed(() => ({
	width: isPanelExpanded.value ? '383px' : '50px',
	transition: 'width 0.3s ease',
}));

type FieldRefs = {
	nameInput: ComponentPublicInstance<typeof N8nInput>;
	// description: ComponentPublicInstance<typeof N8nInput>;
	tagsInput: ComponentPublicInstance<typeof AnnotationTagsDropdownEe>;
	workflowInput: ComponentPublicInstance<typeof WorkflowSelectorParameterInput>;
};

const fields = {
	nameInput: useTemplateRef<FieldRefs['nameInput']>('nameInput'),
	tagsInput: useTemplateRef<FieldRefs['tagsInput']>('tagsInput'),
	workflowInput: useTemplateRef<FieldRefs['workflowInput']>('workflowInput'),
} as const;

const tagsStore = useAnnotationTagsStore();
const allTags = computed(() => tagsStore.allTags);
const isLoading = computed(() => tagsStore.isLoading);
const tagsById = computed(() => tagsStore.tagsById);

function onClickEmptyStateButton() {
	console.log('onClickEmptyStateButton');
}

function onWorkflowSelectorInput(value: INodeParameterResourceLocator) {
	evaluationWorkflow.value = value;
}

function addNewMetric() {
	metrics.value.push('');
}

function togglePanel() {
	isPanelExpanded.value = !isPanelExpanded.value;
}

// Generic edit handling functions
async function startEditing(field: 'name' | 'description' | 'tags') {
	switch (field) {
		case 'name':
			tempName.value = name.value;
			isNameEditing.value = true;
			await nextTick();
			console.log('🚀 ~ startEditing ~ fields.nameInput.value:', fields.nameInput.value);
			fields.nameInput.value?.focus();
			break;
		case 'description':
			// tempDescription.value = description.value;
			// isDescriptionEditing.value = true;
			break;
		case 'tags':
			// tempTagName.value = '';
			isTagsEditing.value = true;
			break;
	}
}

function saveChanges(field: 'name' | 'description' | 'tags') {
	if (field === 'name') {
		name.value = tempName.value;
		console.log('🚀 ~ saveChanges ~ name.value:', name.value);
	}
	// switch (field) {
	// 	case 'name':
	// 			name.value = tempName.value;
	// 			console.log("🚀 ~ saveChanges ~ name.value:", name.value, tempName.value);
	// 			break;
	// 	case 'description':
	// 			description.value = tempDescription.value;
	// 			break;
	// 	case 'tags':
	// 			// Handle tag saving logic here
	// 			break;

	// 	}

	cancelEditing(field);
}

function cancelEditing(field: 'name' | 'description' | 'tags') {
	console.log('Cancel editing', field);
	switch (field) {
		case 'name':
			isNameEditing.value = false;
			N: break;
		case 'description':
			isDescriptionEditing.value = false;
			break;
		case 'tags':
			isTagsEditing.value = false;
			break;
	}
}

function handleKeydown(event: KeyboardEvent, field: 'name' | 'description' | 'tags') {
	if (event.key === 'Escape') {
		cancelEditing(field);
	} else if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		saveChanges(field);
	}
}

function updateMetric(index: number, value: string) {
	metrics.value[index] = value;
}

function onTagUpdate(tags: string[]) {
	// Only one tag can be applied at a time
	appliedTagIds.value = tags[0] ? [tags[0]] : [];
}

function getTagName(tagId: string) {
	return tagsById.value[tagId]?.name ?? '';
}
// Load tags
void tagsStore.fetchAll();
</script>
<template>
	<div :class="$style.container" :style="containerStyle">
		<template v-if="isPanelExpanded">
			<!-- Back button -->
			<div :class="$style.header">
				<n8n-icon-button
					icon="arrow-left"
					:class="$style.backButton"
					type="tertiary"
					:title="$locale.baseText('common.back')"
					@click="$router.back()"
				/>
				<h2 :class="$style.title">
					<template v-if="!isNameEditing">
						{{ name }}
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
						v-model="tempName"
						type="text"
						:placeholder="$locale.baseText('common.name')"
						@blur="() => saveChanges('name')"
						@keydown="(e) => handleKeydown(e, 'name')"
					/>
				</h2>
			</div>

			<!-- Description -->
			<div :class="$style.formGroup">
				<n8n-input-label label="Description" :bold="false" size="small">
					<N8nInput
						ref="description"
						v-model="tempDescription"
						type="textarea"
						:placeholder="$locale.baseText('common.description')"
						@blur="saveChanges('description')"
						@keydown="(e) => handleKeydown(e, 'description')"
					/>
				</n8n-input-label>
			</div>

			<!-- Tags -->
			<div :class="$style.formGroup">
				<n8n-input-label label="Tag name" :bold="false" size="small">
					<div v-if="!isTagsEditing" :class="$style.tagsRead" @click="startEditing('tags')">
						appliedTagIds: {{ appliedTagIds }}
						<n8n-text v-if="appliedTagIds.length === 0" size="small"> Select tag... </n8n-text>
						<n8n-tag
							v-for="tagId in appliedTagIds"
							:key="tagId"
							:text="getTagName(tagId)"
						></n8n-tag>
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
						:model-value="appliedTagIds"
						:placeholder="$locale.baseText('executionAnnotationView.chooseOrCreateATag')"
						:create-enabled="false"
						:event-bus="tagsEventBus"
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
				<n8n-text size="small" color="text-light">
					{{ helpText }}
				</n8n-text>
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
						:model-value="evaluationWorkflow"
						:display-title="'Evaluation Workflow'"
						:is-value-expression="false"
						:expression-edit-dialog-visible="false"
						:path="'workflows'"
						allow-new
						@update:model-value="onWorkflowSelectorInput"
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
						<div v-for="(metric, index) in metrics" :key="index">
							<N8nInput
								:ref="`metric_${index}`"
								:model-value="metric"
								:placeholder="'Enter metric name'"
								@update:model-value="(value) => updateMetric(index, value)"
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

			<!-- Run Test Button -->
			<div :class="$style.footer">
				<n8n-button type="primary" :label="'Run test'" @click="onClickEmptyStateButton" />
			</div>
		</template>
	</div>
</template>

<style module lang="scss">
.container {
	width: 383px;
	height: 1015px;
	padding: var(--spacing-s);
	border: 1px solid var(--color-foreground-base);
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
