<script setup lang="ts">
import { N8nCheckbox } from '@n8n/design-system';

withDefaults(
	defineProps<{
		modelValue?: boolean;
		selectable?: boolean;
		selectionActive?: boolean;
		selectionDisabled?: boolean;
		checkboxAriaLabel: string;
		checkboxTestId?: string;
	}>(),
	{
		modelValue: false,
		selectable: false,
		selectionActive: false,
		selectionDisabled: false,
		checkboxTestId: undefined,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
}>();
</script>

<template>
	<div :class="[$style.wrapper, { [$style.selectable]: selectable }]">
		<div
			v-if="selectable"
			:class="[
				$style.selectionCheckbox,
				{ [$style.selectionCheckboxVisible]: selectionActive || modelValue },
			]"
			data-test-id="card-selection-checkbox"
			:data-selection-visible="selectionActive || modelValue"
			@click.stop
			@mousedown.stop
			@dragstart.stop.prevent
		>
			<N8nCheckbox
				:model-value="modelValue"
				:disabled="selectionDisabled"
				:aria-label="checkboxAriaLabel"
				:data-test-id="checkboxTestId"
				@update:model-value="emit('update:modelValue', $event)"
			/>
		</div>
		<slot />
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	// Fill the list row: list items are flex containers, so the wrapper must
	// stretch rather than shrink to its content width.
	width: 100%;
}

.selectable {
	padding-left: var(--spacing--xl);
}

.selectionCheckbox {
	position: absolute;
	inset: 0 auto 0 0;
	z-index: 1;
	display: flex;
	width: var(--spacing--xl);
	align-items: center;
	justify-content: center;
	opacity: 0;
	pointer-events: none;
	cursor: default;

	&:focus-within {
		opacity: 1;
		pointer-events: auto;
	}

	:global(.el-checkbox) {
		margin-right: 0;
	}
}

.selectionCheckboxVisible {
	opacity: 1;
	pointer-events: auto;
}

@media (hover: hover) {
	.wrapper:hover > .selectionCheckbox {
		opacity: 1;
		pointer-events: auto;
	}
}

@media (hover: none) {
	.selectionCheckbox {
		opacity: 1;
		pointer-events: auto;
	}
}
</style>
