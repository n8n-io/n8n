<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { SAMPLE_EVALUATION_WORKFLOW } from '@/constants.workflows';
import type { IWorkflowDataCreate } from '@/Interface';
import type { INodeParameterResourceLocator, IPinData } from 'n8n-workflow';
import { computed } from 'vue';

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

defineEmits<{
	'update:modelValue': [value: WorkflowSelectorProps['modelValue']];
	workflowCreated: [workflowId: string];
}>();
const locale = useI18n();

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
</script>
<template>
	<div>
		<n8n-input-label
			:label="locale.baseText('testDefinition.edit.workflowSelectorLabel')"
			:bold="false"
		>
			<WorkflowSelectorParameterInput
				ref="workflowInput"
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
				allow-new
				:sample-workflow="sampleWorkflow"
				@update:model-value="$emit('update:modelValue', $event)"
				@workflow-created="$emit('workflowCreated', $event)"
			/>
		</n8n-input-label>
	</div>
</template>
