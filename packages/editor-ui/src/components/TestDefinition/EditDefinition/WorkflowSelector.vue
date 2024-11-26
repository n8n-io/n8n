<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { INodeParameterResourceLocator } from 'n8n-workflow';
interface WorkflowSelectorProps {
	modelValue: INodeParameterResourceLocator;
}

withDefaults(defineProps<WorkflowSelectorProps>(), {
	modelValue: () => ({
		mode: 'id',
		value: '',
		__rl: true,
	}),
});

defineEmits<{ 'update:modelValue': [value: WorkflowSelectorProps['modelValue']] }>();
const locale = useI18n();
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
				@update:model-value="$emit('update:modelValue', $event)"
			/>
		</n8n-input-label>
	</div>
</template>
