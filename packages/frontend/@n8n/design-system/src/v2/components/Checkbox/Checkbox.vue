<script setup lang="ts">
import { reactivePick } from '@vueuse/core';
import { CheckboxIndicator, CheckboxRoot, Label, Primitive, useForwardProps } from 'reka-ui';
import { computed, useId } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type { CheckboxEmits, CheckboxProps, CheckboxSlots } from './Checkbox.types';

defineOptions({ inheritAttrs: false });

const props = defineProps<CheckboxProps>();
const slots = defineSlots<CheckboxSlots>();
const emit = defineEmits<CheckboxEmits>();
const uuid = computed(() => props.id ?? useId());

const rootProps = useForwardProps(reactivePick(props, 'required', 'value', 'defaultValue'));

const modelValue = defineModel<boolean>({ default: undefined });
const computedValue = computed(() => (props.indeterminate ? 'indeterminate' : modelValue.value));

function onUpdate(value: boolean | 'indeterminate') {
	// @ts-expect-error - 'target' does not exist in type 'EventInit'
	emit('change', new Event('change', { target: { value } }));
	modelValue.value = value === 'indeterminate' ? false : value;
}
</script>

<template>
	<Primitive :as :class="$style.Checkbox" :data-disabled="disabled ? '' : undefined">
		<CheckboxRoot
			:id="uuid"
			v-bind="{ ...rootProps, ...$attrs }"
			:model-value="computedValue"
			:name="name"
			:disabled="disabled"
			:class="$style.CheckboxRoot"
			@update:model-value="onUpdate"
		>
			<CheckboxIndicator :class="$style.CheckboxIndicator">
				<Icon v-if="indeterminate" icon="minus" size="small" />
				<Icon v-else icon="check" size="small" />
			</CheckboxIndicator>
		</CheckboxRoot>
		<Label
			v-if="label || !!slots.label"
			:for="uuid"
			:class="$style.Label"
			:data-disabled="disabled ? '' : undefined"
		>
			<slot name="label" :label="label">
				{{ label }}
			</slot>
		</Label>
	</Primitive>
</template>

<style lang="css" module>
.Checkbox {
	display: flex;
	align-items: center;
	flex-direction: row;
	cursor: pointer;
	color: white;
	&[data-disabled] {
		cursor: not-allowed;
	}
}

.CheckboxRoot {
	background: transparent;
	width: 16px;
	height: 16px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: var(--border);
	color: white;
	cursor: inherit;

	&[data-state='checked'],
	&[data-state='indeterminate'] {
		background-color: var(--color--primary);
		border-color: var(--color--primary--shade-1);

		&[data-disabled] {
			background: var(--color--foreground);
			border-color: var(--color--foreground);
		}
	}

	&:focus-visible {
		box-shadow: 0 0 0 2px var(--color--secondary);
		outline: none;
		z-index: 1;
	}
}

.CheckboxIndicator {
	display: flex;
	align-items: center;
	flex-direction: row;
}

.Label {
	padding-left: 15px;
	font-size: 15px;
	line-height: 1;
	cursor: inherit;
	color: var(--color--text--shade-1);
	&[data-disabled] {
		color: var(--color--text--tint-1);
	}
}
</style>
