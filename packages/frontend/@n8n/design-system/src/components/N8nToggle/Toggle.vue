<script setup lang="ts">
import { Toggle, ToggleGroupItem, type AcceptableValue } from 'reka-ui';
import { computed, ref, useAttrs, useCssModule, watch } from 'vue';

import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import type { ButtonProps } from '../../types/button';
import { cn } from '../../utils/cn';
import N8nButton from '../N8nButton';
import N8nTooltip from '../N8nTooltip';

export interface ToggleProps extends Pick<ButtonProps, 'variant' | 'size' | 'disabled' | 'class'> {
	modelValue?: boolean | null;
	value?: AcceptableValue;
	label: string;
	icon?: IconName;
	name?: string;
	required?: boolean;
}

const props = withDefaults(defineProps<ToggleProps>(), {
	variant: 'solid',
	size: 'medium',
	disabled: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
}>();

const attrs = useAttrs();
const $style = useCssModule();

const classes = computed(() => cn($style.toggle, props.class));
const pressed = ref(props.modelValue ?? false);

watch(
	() => props.modelValue,
	(value) => {
		if (value !== undefined) pressed.value = value ?? false;
	},
);

const handleUpdate = (value: boolean) => {
	pressed.value = value;
	emit('update:modelValue', value);
};
</script>

<template>
	<N8nTooltip v-if="!disabled" :content="label">
		<ToggleGroupItem v-if="value !== undefined" :value="value" as-child>
			<N8nButton
				v-bind="attrs"
				:variant="variant"
				:size="size"
				:class="classes"
				:icon="icon"
				icon-only
				:aria-label="label"
			>
				<slot />
			</N8nButton>
		</ToggleGroupItem>

		<Toggle
			v-else
			v-model="pressed"
			:name="name"
			:required="required"
			as-child
			@update:model-value="handleUpdate"
		>
			<N8nButton
				v-bind="attrs"
				:variant="variant"
				:size="size"
				:class="classes"
				:icon="icon"
				icon-only
				:aria-label="label"
			>
				<slot />
			</N8nButton>
		</Toggle>
	</N8nTooltip>

	<ToggleGroupItem v-else-if="value !== undefined" :value="value" disabled as-child>
		<N8nButton
			v-bind="attrs"
			:variant="variant"
			:size="size"
			disabled
			:class="classes"
			:icon="icon"
			icon-only
			:aria-label="label"
		>
			<slot />
		</N8nButton>
	</ToggleGroupItem>

	<Toggle
		v-else
		v-model="pressed"
		disabled
		:name="name"
		:required="required"
		as-child
		@update:model-value="handleUpdate"
	>
		<N8nButton
			v-bind="attrs"
			:variant="variant"
			:size="size"
			disabled
			:class="classes"
			:icon="icon"
			icon-only
			:aria-label="label"
		>
			<slot />
		</N8nButton>
	</Toggle>
</template>

<style lang="scss" module>
.toggle {
	&[data-state='on'] {
		background-color: var(--button--color--background-active);
		box-shadow:
			inset var(--button--border--shadow--active),
			var(--button--shadow--active);
	}
}
</style>
