<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { EditableField } from '../types';

export interface EvaluationHeaderProps {
	modelValue: EditableField<string>;
	startEditing: (field: 'name') => void;
	saveChanges: (field: 'name') => void;
	handleKeydown: (e: KeyboardEvent, field: 'name') => void;
}

defineEmits<{ 'update:modelValue': [value: EditableField<string>] }>();
defineProps<EvaluationHeaderProps>();

const locale = useI18n();
</script>

<template>
	<h2 :class="$style.title">
		<template v-if="!modelValue.isEditing">
			<span :class="$style.titleText">
				{{ modelValue.value }}
			</span>
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
			data-test-id="evaluation-name-input"
			:model-value="modelValue.tempValue"
			type="text"
			:placeholder="locale.baseText('testDefinition.edit.namePlaceholder')"
			@update:model-value="$emit('update:modelValue', { ...modelValue, tempValue: $event })"
			@blur="() => saveChanges('name')"
			@keydown="(e: KeyboardEvent) => handleKeydown(e, 'name')"
		/>
	</h2>
</template>

<style module lang="scss">
.title {
	margin: 0;
	font-size: var(--font-size-xl);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-dark);
	display: flex;
	align-items: center;
	max-width: 100%;
	overflow: hidden;

	.titleText {
		display: block;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.editInputButton {
	--button-font-color: var(--prim-gray-490);
	opacity: 0.2;
	border: none;
}
</style>
