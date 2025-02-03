<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import type { EditableField } from '../types';

interface Props {
	modelValue: EditableField<string>;
	startEditing: (field: 'description') => void;
	saveChanges: (field: 'description') => void;
	handleKeydown: (e: KeyboardEvent, field: 'description') => void;
}

defineProps<Props>();
defineEmits<{ 'update:modelValue': [value: EditableField<string>] }>();

const locale = useI18n();
</script>

<template>
	<div :class="$style.description">
		<template v-if="!modelValue.isEditing">
			<span :class="$style.descriptionText" @click="startEditing('description')">
				<n8n-icon
					v-if="modelValue.value.length === 0"
					:class="$style.icon"
					icon="plus"
					color="text-light"
					size="medium"
				/>
				<N8nText size="medium">
					{{ modelValue.value.length > 0 ? modelValue.value : 'Add a description' }}
				</N8nText>
			</span>
			<n8n-icon-button
				:class="$style.editInputButton"
				icon="pen"
				type="tertiary"
				@click="startEditing('description')"
			/>
		</template>
		<N8nInput
			v-else
			ref="descriptionInput"
			data-test-id="evaluation-description-input"
			:model-value="modelValue.tempValue"
			type="textarea"
			:placeholder="locale.baseText('testDefinition.edit.descriptionPlaceholder')"
			@update:model-value="$emit('update:modelValue', { ...modelValue, tempValue: $event })"
			@blur="() => saveChanges('description')"
			@keydown="(e: KeyboardEvent) => handleKeydown(e, 'description')"
		/>
	</div>
</template>

<style module lang="scss">
.description {
	display: flex;
	align-items: center;
	color: var(--color-text-light);
	font-size: var(--font-size-s);

	&:hover {
		.editInputButton {
			opacity: 1;
		}
	}
}

.descriptionText {
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;

	.icon {
		margin-right: var(--spacing-2xs);
	}
}

.editInputButton {
	--button-font-color: var(--prim-gray-490);
	opacity: 0;
	border: none;
}
</style>
