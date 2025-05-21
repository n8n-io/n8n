<script lang="ts" setup>
import { EditableArea, EditableInput, EditablePreview, EditableRoot } from 'reka-ui';
import { ref } from 'vue';

type Props = {
	modelValue: string;
	readOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	readOnly: false,
});

const newValue = ref(props.modelValue);

const emit = defineEmits<{
	'update:model-value': [value: string];
}>();

function onSubmit() {
	emit('update:model-value', newValue.value);
}

function onInput(value: string) {
	newValue.value = value;
}
</script>

<template>
	<div style="width: 250px">
		<EditableRoot
			placeholder="Enter text..."
			class="EditableRoot"
			:model-value="newValue"
			auto-resize
			select-on-focus
			@submit="onSubmit"
			@update:model-value="onInput"
		>
			<EditableArea class="EditableArea">
				<EditablePreview />
				<EditableInput />
			</EditableArea>
		</EditableRoot>
	</div>
</template>

<style lang="scss" scoped>
.EditableRoot {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.EditableArea {
	color: var(--white);
	width: 250px;
}

.EditableWrapper {
	display: flex;
	gap: 1rem;
}

.EditableSubmitTrigger {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 0.25rem;
	font-weight: 500;
	font-size: 0.9375rem;
	padding: 0.9375rem 1.25rem;
	height: 2.1875rem;
	background-color: var(--grass8);
	color: var(--white);
	box-shadow:
		0px 2px 1.25rem rgba(0, 0, 0, 0.07),
		0px 2px 1.25rem rgba(0, 0, 0, 0.07);
	outline: none;
	transition:
		background-color 0.2s,
		box-shadow 0.2s;
}

.EditableTrigger {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 0.25rem;
	font-weight: 500;
	font-size: 0.9375rem;
	padding: 0.9375rem 1.25rem;
	height: 2.1875rem;
	background-color: var(--white);
	color: var(--grass11);
	box-shadow:
		0px 2px 1.25rem rgba(0, 0, 0, 0.07),
		0px 2px 1.25rem rgba(0, 0, 0, 0.07);
	outline: none;
	transition:
		background-color 0.2s,
		box-shadow 0.2s;
}
</style>
