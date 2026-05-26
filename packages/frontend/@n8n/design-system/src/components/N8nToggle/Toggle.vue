<script setup lang="ts">
import { Toggle, ToggleGroupItem, type AcceptableValue } from 'reka-ui';
import { computed, ref, useAttrs, useCssModule } from 'vue';

import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import type { IconSize } from '../../types';
import type { ButtonProps } from '../../types/button';
import { cn } from '../../utils/cn';
import N8nIcon from '../N8nIcon';
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

const effectiveSize = computed(() => {
	if (props.size === 'mini' || props.size === 'xmini') return 'xsmall';
	return props.size;
});

const effectiveVariant = computed(() => {
	if (props.variant === 'highlight') return 'ghost';
	if (props.variant === 'highlight-fill') return 'ghost';
	return props.variant;
});

const computedIconSize = computed((): IconSize => {
	if (effectiveSize.value === 'xsmall') return 'xsmall';
	return effectiveSize.value as IconSize;
});

const classes = computed(() =>
	cn(
		'button',
		$style.toggle,
		$style[effectiveVariant.value],
		$style[effectiveSize.value],
		$style.iconOnly,
		props.disabled && $style.disabled,
		props.class,
	),
);
const uncontrolledPressed = ref(props.modelValue ?? false);

const pressed = computed({
	get: () => props.modelValue ?? uncontrolledPressed.value,
	set: (value: boolean) => {
		if (props.modelValue === undefined) uncontrolledPressed.value = value;
		emit('update:modelValue', value);
	},
});
</script>

<template>
	<N8nTooltip :content="label" :disabled="disabled">
		<ToggleGroupItem
			v-if="value !== undefined"
			v-bind="attrs"
			:value="value"
			:disabled="disabled"
			:class="classes"
			:aria-label="label"
			data-icon-only="true"
		>
			<span :class="$style['toggle-inner']">
				<N8nIcon v-if="icon" :icon="icon" :size="computedIconSize" />
				<slot />
			</span>
		</ToggleGroupItem>

		<Toggle
			v-else
			v-bind="attrs"
			v-model="pressed"
			:disabled="disabled"
			:name="name"
			:required="required"
			:class="classes"
			:aria-label="label"
			data-icon-only="true"
		>
			<span :class="$style['toggle-inner']">
				<N8nIcon v-if="icon" :icon="icon" :size="computedIconSize" />
				<slot />
			</span>
		</Toggle>
	</N8nTooltip>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.toggle {
	appearance: none;
	touch-action: manipulation;
	-webkit-tap-highlight-color: transparent;
	user-select: none;
	width: fit-content;
	display: grid;
	align-items: center;
	font-weight: var(--font-weight--medium);
	line-height: 1;
	cursor: pointer;
	text-decoration: none;

	height: var(--button--height);
	padding: var(--button--padding);
	border-radius: var(--button--radius);
	font-size: var(--button--font-size);

	--button--color--background: transparent;
	--button--color--background-hover: var(--background--hover);
	--button--color--background-active: var(--background--active);
	--button--color: var(--text-color);
	--button--shadow: 0 0 0 0 transparent;
	--button--shadow--hover: 0 0 0 0 transparent;
	--button--shadow--active: 0 0 0 0 transparent;
	--button--border--shadow: 0 0 0 0 transparent;
	--button--border--shadow--hover: 0 0 0 0 transparent;
	--button--border--shadow--active: 0 0 0 0 transparent;
	--button--border-color: transparent;
	--button--border-color--hover: transparent;
	--button--border-color--active: transparent;

	background-color: var(--button--color--background);
	color: var(--button--color);
	box-shadow:
		inset var(--button--border--shadow),
		var(--button--shadow);
	border: none;

	> * {
		grid-area: 1 / 1;
	}

	&:hover {
		background-color: var(--button--color--background-hover);
		box-shadow:
			inset var(--button--border--shadow--hover),
			var(--button--shadow--hover);
	}

	&:active,
	&[data-state='on'] {
		background-color: var(--button--color--background-active);
		box-shadow:
			inset var(--button--border--shadow--active),
			var(--button--shadow--active);
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		@include focus.focus-ring;
		--button--border-color: var(--focus--border-color) !important;
	}

	&.xsmall {
		--button--height: var(--height--xs);
		--button--padding: 0 var(--spacing--2xs);
		--button--radius: var(--radius--3xs);
		--button--font-size: var(--font-size--2xs);
	}

	&.small {
		--button--height: var(--height--sm);
		--button--padding: 0 var(--spacing--xs);
		--button--radius: var(--radius--3xs);
		--button--font-size: var(--font-size--xs);
	}

	&.medium {
		--button--height: var(--height--md);
		--button--padding: 0 var(--spacing--xs);
		--button--radius: var(--radius--3xs);
		--button--font-size: var(--font-size--sm);
	}

	&.large {
		--button--height: var(--height--lg);
		--button--padding: 0 var(--spacing--sm);
		--button--radius: var(--radius--2xs);
		--button--font-size: var(--font-size--sm);
	}

	&.xlarge {
		--button--height: var(--height--xl);
		--button--padding: 0 var(--spacing--sm);
		--button--radius: var(--radius--xs);
		--button--font-size: var(--font-size--md);
	}

	&.solid {
		--button--color--background: var(--background--brand);
		--button--color--background-hover: var(--background--brand--hover);
		--button--color--background-active: var(--background--brand--active);
		--button--color: var(--color--neutral-white);
		--button--shadow: var(--shadow--xs);
		--button--shadow--hover: var(--shadow--xs);
		--button--shadow--active: var(--shadow--xs);
		--button--border-color: var(--background--brand);
		--button--border-color--hover: var(--background--brand--hover);
		--button--border-color--active: var(--background--brand--active);
		--button--border--shadow: 0 0 0 1px var(--button--border-color);
		--button--border--shadow--hover: 0 0 0 1px var(--button--border-color--hover);
		--button--border--shadow--active: 0 0 0 1px var(--button--border-color--active);
	}

	&.subtle {
		--button--color--background: var(--background--surface);
		--button--color--background-hover: color-mix(
			in srgb,
			var(--button--color--background),
			var(--background--hover)
		);
		--button--color--background-active: color-mix(
			in srgb,
			var(--button--color--background),
			var(--background--active)
		);
		--button--shadow: var(--shadow--xs);
		--button--shadow--hover: var(--shadow--xs);
		--button--shadow--active: var(--shadow--xs);
		--button--border-color: var(--border-color);
		--button--border-color--hover: light-dark(
			var(--color--black-alpha-200),
			var(--color--white-alpha-200)
		);
		--button--border-color--active: light-dark(
			var(--color--black-alpha-300),
			var(--color--white-alpha-300)
		);
		--button--border--shadow: 0 0 0 1px var(--button--border-color);
		--button--border--shadow--hover: 0 0 0 1px var(--button--border-color--hover);
		--button--border--shadow--active: 0 0 0 1px var(--button--border-color--active);
	}

	&.outline {
		--button--color--background: transparent;
		--button--border-color: var(--border-color);
		--button--border-color--hover: light-dark(
			var(--color--black-alpha-200),
			var(--color--white-alpha-200)
		);
		--button--border-color--active: light-dark(
			var(--color--black-alpha-300),
			var(--color--white-alpha-300)
		);
		--button--border--shadow: 0 0 0 1px var(--button--border-color);
		--button--border--shadow--hover: 0 0 0 1px var(--button--border-color--hover);
		--button--border--shadow--active: 0 0 0 1px var(--button--border-color--active);
	}

	&.ghost {
		--button--color--background: transparent;
		--button--border-color: transparent;
		--button--border--shadow: 0 0 0 1px var(--button--border-color);
		--button--border--shadow--hover: 0 0 0 1px var(--button--border-color);
		--button--border--shadow--active: 0 0 0 1px var(--button--border-color);
	}

	&.destructive {
		--button--color--background: light-dark(var(--color--red-500), var(--color--red-600));
		--button--color--background-hover: light-dark(var(--color--red-600), var(--color--red-500));
		--button--color--background-active: light-dark(var(--color--red-600), var(--color--red-400));
		--button--color: var(--color--neutral-white);
		--button--shadow: light-dark(
			0 1px 3px 0 var(--color--black-alpha-100),
			0 1px 3px 0 var(--color--black-alpha-200)
		);
		--button--shadow--hover: light-dark(
			0 1px 3px 0 var(--color--black-alpha-100),
			0 1px 3px 0 var(--color--black-alpha-200)
		);
		--button--shadow--active: light-dark(
			0 1px 3px 0 var(--color--black-alpha-100),
			0 1px 3px 0 var(--color--black-alpha-200)
		);
		--button--border-color: light-dark(var(--color--red-500), var(--color--red-600));
		--button--border-color--hover: light-dark(var(--color--red-600), var(--color--red-500));
		--button--border-color--active: light-dark(var(--color--red-600), var(--color--red-400));
		--button--border--shadow: 0 0 0 1px var(--button--border-color);
		--button--border--shadow--hover: 0 0 0 1px var(--button--border-color--hover);
		--button--border--shadow--active: 0 0 0 1px var(--button--border-color--active);
	}

	&.success {
		--button--color--background: light-dark(var(--color--green-600), var(--color--green-700));
		--button--color--background-hover: light-dark(var(--color--green-700), var(--color--green-600));
		--button--color--background-active: light-dark(
			var(--color--green-700),
			var(--color--green-500)
		);
		--button--color: var(--color--neutral-white);
		--button--shadow: light-dark(
			0 1px 3px 0 var(--color--black-alpha-100),
			0 1px 3px 0 var(--color--black-alpha-200)
		);
		--button--shadow--hover: light-dark(
			0 1px 3px 0 var(--color--black-alpha-100),
			0 1px 3px 0 var(--color--black-alpha-200)
		);
		--button--shadow--active: light-dark(
			0 1px 3px 0 var(--color--black-alpha-100),
			0 1px 3px 0 var(--color--black-alpha-200)
		);
		--button--border-color: light-dark(var(--color--green-600), var(--color--green-700));
		--button--border-color--hover: light-dark(var(--color--green-700), var(--color--green-600));
		--button--border-color--active: light-dark(var(--color--green-700), var(--color--green-500));
		--button--border--shadow: 0 0 0 1px var(--button--border-color);
		--button--border--shadow--hover: 0 0 0 1px var(--button--border-color--hover);
		--button--border--shadow--active: 0 0 0 1px var(--button--border-color--active);
	}

	&.disabled {
		opacity: 0.5;
		cursor: not-allowed;

		&:hover {
			background-color: var(--button--color--background);
			box-shadow:
				inset var(--button--border--shadow),
				var(--button--shadow);
		}
	}

	&.iconOnly {
		width: var(--button--height);
		padding: 0;
		justify-content: center;
		align-items: center;

		> * {
			width: var(--button--height);
		}
	}
}

.toggle-inner {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
	white-space: nowrap;
}
</style>
