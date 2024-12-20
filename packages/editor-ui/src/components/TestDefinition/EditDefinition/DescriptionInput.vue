<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';

interface Props {
	modelValue: string;
}

withDefaults(defineProps<Props>(), {
	modelValue: '',
});

defineEmits<{ 'update:modelValue': [value: string] }>();

const locale = useI18n();
</script>

<template>
	<div :class="[$style.description]">
		<n8n-input-label
			:label="locale.baseText('testDefinition.edit.description')"
			:bold="false"
			size="small"
			:class="$style.field"
		>
			<N8nInput
				:model-value="modelValue"
				type="textarea"
				:placeholder="locale.baseText('testDefinition.edit.descriptionPlaceholder')"
				@update:model-value="$emit('update:modelValue', $event)"
			/>
		</n8n-input-label>
	</div>
</template>

<style module lang="scss">
.field {
	width: 100%;
	margin-top: var(--spacing-xs);
}
</style>
