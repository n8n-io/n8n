<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';

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

const locale = useI18n();
</script>

<template>
	<div :class="$style.header">
		<n8n-icon-button
			icon="arrow-left"
			:class="$style.backButton"
			type="tertiary"
			:title="locale.baseText('testDefinition.edit.backButtonTitle')"
			@click="$router.back()"
		/>
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
	opacity: 0;
	border: none;
}

.backButton {
	--button-font-color: var(--color-text-light);
	border: none;
}
</style>
