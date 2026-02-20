<script setup lang="ts">
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { CheckboxIndicator, CheckboxRoot, Label, Primitive, useForwardProps } from 'reka-ui';
import { computed, useAttrs, useId } from 'vue';

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

const attrs = useAttrs();
const primitiveClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, ['class']));

function onUpdate(value: boolean | 'indeterminate') {
	// @ts-expect-error - 'target' does not exist in type 'EventInit'
	emit('change', new Event('change', { target: { value } }));
	modelValue.value = value === 'indeterminate' ? false : value;
}
</script>

<template>
	<Primitive
		:as
		:class="[$style.checkbox, primitiveClass]"
		:data-disabled="disabled ? '' : undefined"
	>
		<CheckboxRoot
			:id="uuid"
			v-bind="{ ...rootProps, ...rootAttrs }"
			:model-value="computedValue"
			:name="name"
			:disabled="disabled"
			:class="$style.checkboxRoot"
			@update:model-value="onUpdate"
		>
			<CheckboxIndicator :class="$style.checkboxIndicator">
				<Icon v-if="indeterminate" icon="minus" size="small" />
				<Icon v-else icon="check" size="small" />
			</CheckboxIndicator>
		</CheckboxRoot>
		<Label
			v-if="label || !!slots.label"
			:for="uuid"
			:class="$style.label"
			:data-disabled="disabled ? '' : undefined"
		>
			<slot name="label" :label="label">
				{{ label }}
			</slot>
		</Label>
	</Primitive>
</template>

<style lang="css" module>
.checkbox {
	display: inline-flex;
	flex-direction: row;
	gap: var(--spacing--2xs);
	cursor: pointer;
	color: white;
	&[data-disabled] {
		cursor: not-allowed;
	}
}

.checkboxRoot {
	position: relative;
	background: transparent;
	width: 16px;
	height: 16px;
	border-radius: var(--radius);
	display: flex;
	align-items: center;
	justify-content: center;
	border: var(--border);
	color: white;
	cursor: inherit;
	flex-shrink: 0;

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

.checkboxIndicator {
	position: absolute;
	display: flex;
	align-items: center;
	justify-content: center;
}

.label {
	flex: 1;
	padding-top: 1px;
	font-size: var(--font-size--sm);
	line-height: 1;
	color: var(--color--text--shade-1);
	cursor: inherit;

	&[data-disabled] {
		color: var(--color--text--tint-1);
	}
}
</style>
