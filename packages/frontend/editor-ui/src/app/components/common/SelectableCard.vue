<script setup lang="ts">
import { N8nCheckbox } from '@n8n/design-system';
import { nextTick, ref } from 'vue';

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

const selectionCheckbox = ref<HTMLElement>();
let isPointerInteraction = false;

const onCheckboxChange = (value: boolean) => {
	emit('update:modelValue', value);
	const shouldBlur = !value && isPointerInteraction;
	isPointerInteraction = false;
	if (!shouldBlur) return;

	void nextTick(() => {
		const activeElement = document.activeElement;
		if (activeElement instanceof HTMLElement && selectionCheckbox.value?.contains(activeElement)) {
			activeElement.blur();
		}
	});
};
</script>

<template>
	<div :class="$style.wrapper">
		<div
			v-if="selectable"
			ref="selectionCheckbox"
			:class="[
				$style.selectionCheckbox,
				{ [$style.selectionCheckboxVisible]: selectionActive || modelValue },
			]"
			data-test-id="card-selection-checkbox"
			:data-selection-visible="selectionActive || modelValue"
			@click.stop
			@pointerdown="isPointerInteraction = true"
			@mousedown.stop
			@dragstart.stop.prevent
		>
			<N8nCheckbox
				:model-value="modelValue"
				:disabled="selectionDisabled"
				:aria-label="checkboxAriaLabel"
				:data-test-id="checkboxTestId"
				@update:model-value="onCheckboxChange"
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

.selectionCheckbox {
	position: absolute;
	inset: 50% 100% auto auto;
	z-index: 1;
	display: flex;
	width: var(--spacing--xl);
	align-items: center;
	justify-content: center;
	transform: translateY(-50%);
	opacity: 0;
	cursor: default;

	&:hover,
	&:focus-within {
		opacity: 1;
	}

	:global(.el-checkbox) {
		margin-right: 0;
	}
}

.selectionCheckboxVisible {
	opacity: 1;
}

@media (hover: hover) {
	.wrapper:hover > .selectionCheckbox {
		opacity: 1;
	}
}

@media (hover: none) {
	.selectionCheckbox {
		opacity: 1;
	}
}
</style>
