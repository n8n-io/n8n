<script setup lang="ts">
interface Props {
	modelValue: string;
}

withDefaults(defineProps<Props>(), {
	modelValue: '',
});

defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
	<div :class="[$style.formGroup, $style.description]">
		<n8n-input-label label="Description" :bold="false" size="small" :class="$style.field">
			<N8nInput
				:model-value="modelValue"
				type="textarea"
				:placeholder="$locale.baseText('workflowEvaluation.edit.descriptionPlaceholder')"
				@update:model-value="$emit('update:modelValue', $event)"
			/>
		</n8n-input-label>
	</div>
</template>

<style module lang="scss">
.formGroup {
	margin-bottom: var(--spacing-l);

	:global(.n8n-input-label) {
		margin-bottom: var(--spacing-2xs);
	}
}

.field {
	width: 100%;
	margin-top: var(--spacing-xs);
}
</style>
