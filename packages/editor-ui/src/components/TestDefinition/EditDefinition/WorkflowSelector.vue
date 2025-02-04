<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { SAMPLE_EVALUATION_WORKFLOW } from '@/constants.workflows';
import type { IWorkflowDataCreate } from '@/Interface';
import { N8nButton, N8nLink } from 'n8n-design-system';
import type { INodeParameterResourceLocator, IPinData } from 'n8n-workflow';
import { computed, ref } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';

interface WorkflowSelectorProps {
	modelValue: INodeParameterResourceLocator;
	examplePinnedData?: IPinData;
	sampleWorkflowName?: string;
}

const props = withDefaults(defineProps<WorkflowSelectorProps>(), {
	modelValue: () => ({
		mode: 'id',
		value: '',
		__rl: true,
	}),
	examplePinnedData: () => ({}),
	sampleWorkflowName: undefined,
});

const emit = defineEmits<{ 'update:modelValue': [value: WorkflowSelectorProps['modelValue']] }>();
const locale = useI18n();

const projectStore = useProjectsStore();
const workflowsStore = useWorkflowsStore();
const router = useRouter();

const subworkflowName = computed(() => {
	if (props.sampleWorkflowName) {
		return locale.baseText('testDefinition.workflowInput.subworkflowName', {
			interpolate: { name: props.sampleWorkflowName },
		});
	}
	return locale.baseText('testDefinition.workflowInput.subworkflowName.default');
});

const sampleWorkflow = computed<IWorkflowDataCreate>(() => {
	return {
		...SAMPLE_EVALUATION_WORKFLOW,
		name: subworkflowName.value,
		pinData: props.examplePinnedData,
	};
});

const selectorVisible = ref(false);

const updateModelValue = (value: INodeParameterResourceLocator) => emit('update:modelValue', value);

/**
 * copy pasted from WorkflowSelectorParameterInput.vue
 * but we should remove it from here
 */
const handleDefineEvaluation = async () => {
	const projectId = projectStore.currentProjectId;
	const workflowName = sampleWorkflow.value.name ?? 'My Sub-Workflow';
	const sampleSubWorkflows = workflowsStore.allWorkflows.filter(
		(w) => w.name && new RegExp(workflowName).test(w.name),
	);

	const workflow: IWorkflowDataCreate = {
		...sampleWorkflow.value,
		name: `${workflowName} ${sampleSubWorkflows.length + 1}`,
	};
	if (projectId) {
		workflow.projectId = projectId;
	}
	// telemetry.track('User clicked create new sub-workflow button', {}, { withPostHog: true });

	const newWorkflow = await workflowsStore.createNewWorkflow(workflow);
	const { href } = router.resolve({ name: VIEWS.WORKFLOW, params: { name: newWorkflow.id } });

	updateModelValue({
		...props.modelValue,
		value: newWorkflow.id,
		cachedResultName: workflow.name,
	});

	window.open(href, '_blank');
};
</script>
<template>
	<div>
		<n8n-input-label
			:label="locale.baseText('testDefinition.edit.workflowSelectorLabel')"
			:bold="false"
		/>
		<template v-if="!modelValue.value">
			<N8nButton icon="plus" block class="mb-xs" @click="handleDefineEvaluation">
				Define evaluation logic
			</N8nButton>
			<N8nLink class="mb-xs" style="display: block" @click="selectorVisible = !selectorVisible">
				Select existing evaluation sub-workflow
			</N8nLink>
		</template>

		<WorkflowSelectorParameterInput
			v-if="modelValue.value || selectorVisible"
			:parameter="{
				displayName: locale.baseText('testDefinition.edit.workflowSelectorDisplayName'),
				name: 'workflowId',
				type: 'workflowSelector',
				default: '',
			}"
			:model-value="modelValue"
			:display-title="locale.baseText('testDefinition.edit.workflowSelectorTitle')"
			:is-value-expression="false"
			:expression-edit-dialog-visible="false"
			:path="'workflows'"
			:allow-new="false"
			:sample-workflow="sampleWorkflow"
			:new-resource-label="locale.baseText('testDefinition.workflow.createNew')"
			@update:model-value="updateModelValue"
		/>
	</div>
</template>
