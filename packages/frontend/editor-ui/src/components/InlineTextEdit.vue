<script setup lang="ts">
import { ref, watch } from 'vue';
import ExpandableInputEdit from '@/components/ExpandableInput/ExpandableInputEdit.vue';
import ExpandableInputPreview from '@/components/ExpandableInput/ExpandableInputPreview.vue';
import { createEventBus } from '@n8n/utils/event-bus';

const props = withDefaults(
	defineProps<{
		isEditEnabled: boolean;
		modelValue: string;
		placeholder: string;
		maxLength: number;
		previewValue: string;
		disabled: boolean;
	}>(),
	{
		isEditEnabled: false,
		modelValue: '',
		placeholder: '',
		maxLength: 0,
		previewValue: '',
		disabled: false,
	},
);

const emit = defineEmits<{
	toggle: [];
	submit: [payload: { name: string; onSubmit: (updated: boolean) => void }];
}>();

const isDisabled = ref(props.disabled);
const newValue = ref('');
const escPressed = ref(false);
const inputBus = ref(createEventBus());

watch(
	() => props.disabled,
	(value) => {
		isDisabled.value = value;
	},
);

function onInput(val: string) {
	if (isDisabled.value) return;
	newValue.value = val;
}

function onClick() {
	if (isDisabled.value) return;
	newValue.value = props.modelValue;
	emit('toggle');
}

function onBlur() {
	if (isDisabled.value) return;
	if (!escPressed.value) {
		submit();
	}
	escPressed.value = false;
}

function submit() {
	if (isDisabled.value) return;
	const onSubmit = (updated: boolean) => {
		isDisabled.value = false;
		if (!updated) {
			inputBus.value.emit('focus');
		}
	};
	isDisabled.value = true;
	emit('submit', { name: newValue.value, onSubmit });
}

function onEscape() {
	if (isDisabled.value) return;
	escPressed.value = true;
	emit('toggle');
}
</script>

<template>
	<span class="inline-edit" @keydown.stop>
		<span v-if="isEditEnabled && !isDisabled">
			<ExpandableInputEdit
				v-model="newValue"
				:placeholder="placeholder"
				:maxlength="maxLength"
				:autofocus="true"
				:event-bus="inputBus"
				@update:model-value="onInput"
				@esc="onEscape"
				@blur="onBlur"
				@enter="submit"
			/>
		</span>

		<span v-else class="preview" @click="onClick">
			<ExpandableInputPreview :model-value="previewValue || modelValue" />
		</span>
	</span>
</template>

<style lang="scss" scoped>
.preview {
	cursor: pointer;
}
</style>
