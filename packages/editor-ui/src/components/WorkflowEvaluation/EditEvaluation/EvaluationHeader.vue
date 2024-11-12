<script setup lang="ts">
export interface EvaluationHeaderProps {
	modelValue: {
		value: string;
		isEditing: boolean;
		tempValue: string;
	};
	startEditing: (field: string) => void;
	saveChanges: (field: string) => void;
	handleKeydown: (e: KeyboardEvent, field: string) => void;
}

defineEmits<{ 'update:modelValue': [value: EvaluationHeaderProps['modelValue']] }>();
defineProps<EvaluationHeaderProps>();
</script>

<template>
	<div :class="$style.header">
		<n8n-icon-button
			icon="arrow-left"
			:class="$style.backButton"
			type="tertiary"
			:title="$locale.baseText('common.back')"
			@click="$router.back()"
		/>
		<h2 :class="$style.title">
			<template v-if="!modelValue.isEditing">
				{{ modelValue.value }}
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
				:model-value="modelValue.tempValue"
				type="text"
				:placeholder="$locale.baseText('common.name')"
				@update:model-value="$emit('update:modelValue', { ...modelValue, tempValue: $event })"
				@blur="() => saveChanges('name')"
				@keydown="(e: KeyboardEvent) => handleKeydown(e, 'name')"
			/>
		</h2>
	</div>
</template>

<style module lang="scss">
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
