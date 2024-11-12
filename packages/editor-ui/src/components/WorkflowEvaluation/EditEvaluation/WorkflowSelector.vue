<script setup lang="ts">
import type { INodeParameterResourceLocator } from 'n8n-workflow';
interface WorkflowSelectorProps {
	modelValue: INodeParameterResourceLocator;
	helpText: string;
}

withDefaults(defineProps<WorkflowSelectorProps>(), {
	modelValue: () => ({
		mode: 'id',
		value: 'Test Workflow?',
		__rl: true,
	}),
});

defineEmits<{ 'update:modelValue': [value: WorkflowSelectorProps['modelValue']] }>();
</script>
<template>
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
				:model-value="modelValue"
				:display-title="'Evaluation Workflow'"
				:is-value-expression="false"
				:expression-edit-dialog-visible="false"
				:path="'workflows'"
				allow-new
				@update:model-value="$emit('update:modelValue', $event)"
			/>
		</n8n-input-label>
		<n8n-text size="small" color="text-light">
			{{ helpText }}
		</n8n-text>
	</div>
</template>

<style module lang="scss">
.formGroup {
	margin-bottom: var(--spacing-l);

	:global(.n8n-input-label) {
		margin-bottom: var(--spacing-2xs);
	}
}
</style>
