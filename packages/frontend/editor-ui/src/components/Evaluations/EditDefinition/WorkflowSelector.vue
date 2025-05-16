<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { VIEWS } from '@/constants';
import { SAMPLE_EVALUATION_WORKFLOW } from '@/constants.workflows';
import type { IWorkflowDataCreate } from '@/Interface';
import { useProjectsStore } from '@/stores/projects.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { N8nButton, N8nLink } from '@n8n/design-system';
import type { INodeParameterResourceLocator, IPinData } from 'n8n-workflow';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

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

const emit = defineEmits<{
	'update:modelValue': [value: WorkflowSelectorProps['modelValue']];
	workflowCreated: [workflowId: string];
}>();
const locale = useI18n();

const projectStore = useProjectsStore();
const workflowsStore = useWorkflowsStore();
const router = useRouter();

const subworkflowName = computed(() => {
	if (props.sampleWorkflowName) {
		return locale.baseText('evaluation.workflowInput.subworkflowName', {
			interpolate: { name: props.sampleWorkflowName },
		});
	}
	return locale.baseText('evaluation.workflowInput.subworkflowName.default');
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
	<div class="mt-xs">
		<template v-if="!modelValue.value">
			<N8nButton type="secondary" class="mb-xs" @click="handleDefineEvaluation">
				{{ locale.baseText('evaluation.workflow.createNew') }}
			</N8nButton>
			<N8nLink class="mb-xs" style="display: block" @click="selectorVisible = !selectorVisible">
				{{ locale.baseText('evaluation.workflow.createNew.or') }}
			</N8nLink>
		</template>

		<WorkflowSelectorParameterInput
			v-if="modelValue.value || selectorVisible"
			:parameter="{
				displayName: locale.baseText('evaluation.edit.workflowSelectorDisplayName'),
				name: 'workflowId',
				type: 'workflowSelector',
				default: '',
			}"
			:model-value="modelValue"
			:display-title="locale.baseText('evaluation.edit.workflowSelectorTitle')"
			:is-value-expression="false"
			:expression-edit-dialog-visible="false"
			:path="'workflows'"
			:allow-new="false"
			:sample-workflow="sampleWorkflow"
			:new-resource-label="locale.baseText('evaluation.workflow.createNew')"
			@update:model-value="updateModelValue"
			@workflow-created="emit('workflowCreated', $event)"
		/>
	</div>
</template>
