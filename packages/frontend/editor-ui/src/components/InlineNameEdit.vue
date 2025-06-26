<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { useToast } from '@/composables/useToast';
import { onClickOutside } from '@vueuse/core';
import type { InputType } from '@n8n/design-system';

interface Props {
	modelValue: string;
	subtitle?: string;
	type: InputType;
	readonly?: boolean;
	placeholder?: string;
	maxlength?: number;
	required?: boolean;
	autosize?: boolean | { minRows: number; maxRows: number };
	inputType?: InputType;
	maxHeight?: string;
}
const props = withDefaults(defineProps<Props>(), {
	placeholder: '',
	maxlength: 64,
	required: true,
	autosize: false,
	inputType: 'text',
	maxHeight: '22px',
	subtitle: '',
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const isNameEdit = ref(false);
const nameInput = ref<HTMLInputElement | null>(null);
const { showToast } = useToast();

const onNameEdit = (value: string) => {
	emit('update:modelValue', value);
};

const enableNameEdit = () => {
	isNameEdit.value = true;
	void nextTick(() => nameInput.value?.focus());
};

const disableNameEdit = () => {
	if (!props.modelValue && props.required) {
		emit('update:modelValue', `Untitled ${props.type}`);
		showToast({
			title: 'Error',
			message: `${props.type} name cannot be empty`,
			type: 'warning',
		});
	}
	isNameEdit.value = false;
};

onClickOutside(nameInput, disableNameEdit);
</script>

<template>
	<div :class="$style.container">
		<span v-if="readonly" :class="$style.headline">
			{{ modelValue }}
		</span>
		<div
			v-else
			:class="{
				[$style.headline]: true,
				[$style['headline-editable']]: true,
				[$style.editing]: isNameEdit,
			}"
			@keydown.stop
			@click="enableNameEdit"
		>
			<div v-if="!isNameEdit">
				<span>
					<n8n-text v-if="!modelValue" size="small" color="text-base">{{ placeholder }}</n8n-text>
					<slot v-else>{{ modelValue }}</slot>
				</span>
				<i><font-awesome-icon icon="pen" /></i>
			</div>
			<div v-else :class="{ [$style.nameInput]: props.inputType !== 'textarea' }">
				<n8n-input
					ref="nameInput"
					:model-value="modelValue"
					size="large"
					:type="inputType"
					:maxlength
					:placeholder
					:autosize
					@update:model-value="onNameEdit"
					@change="disableNameEdit"
				/>
			</div>
		</div>
		<div v-if="!isNameEdit && subtitle" :class="$style.subtitle">
			{{ subtitle }}
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	align-items: flex-start;
	justify-content: center;
	flex-direction: column;
	min-height: 36px;
}

.headline {
	font-size: var(--font-size-m);
	line-height: 1.4;
	margin-bottom: var(--spacing-5xs);
	display: inline-block;
	padding: 0 var(--spacing-4xs);
	border-radius: var(--border-radius-base);
	position: relative;
	min-height: 22px;
	max-height: v-bind(maxHeight);
	font-weight: var(--font-weight-regular);

	&.editing {
		width: 100%;
	}
	i {
		display: var(--headline-icon-display, none);
		font-size: 0.75em;
		margin-left: 8px;
		color: var(--color-text-base);
	}

	:global(textarea) {
		resize: none;
	}
}

.headline-editable {
	cursor: pointer;

	&:hover {
		background-color: var(--color-background-base);
		--headline-icon-display: inline-flex;
	}
}

.nameInput {
	z-index: 1;
	position: absolute;
	margin-top: 1px;
	top: 50%;
	left: 0;
	width: 400px;
	transform: translateY(-50%);
}

.subtitle {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
	margin-left: 4px;
	font-weight: var(--font-weight-regular);
}
</style>
