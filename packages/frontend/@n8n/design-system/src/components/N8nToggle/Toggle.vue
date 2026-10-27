<script setup lang="ts">
import { Toggle as TogglePrimitive, ToggleGroupItem, type AcceptableValue } from 'reka-ui';
import { computed, ref, useAttrs, useCssModule } from 'vue';

import type { IconSize } from '../../types';
import type { ButtonProps } from '../../types/button';
import { cn } from '../../utils/cn';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nTooltip from '../N8nTooltip';

export interface ToggleProps extends Pick<ButtonProps, 'variant' | 'size' | 'disabled' | 'class'> {
	modelValue?: boolean | null;
	value?: AcceptableValue;
	label: string;
	showTooltip?: boolean;
	icon?: IconName;
	name?: string;
	required?: boolean;
}

const props = withDefaults(defineProps<ToggleProps>(), {
	variant: 'solid',
	size: 'medium',
	disabled: false,
	showTooltip: true,
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

const computedIconSize = computed((): IconSize => {
	if (effectiveSize.value === 'xsmall') return 'xsmall';
	return effectiveSize.value;
});

const classes = computed(() =>
	cn(
		'button',
		$style.toggle,
		$style[props.variant],
		$style[effectiveSize.value],
		$style.iconOnly,
		props.disabled && $style.disabled,
		props.class,
	),
);

const uncontrolledPressed = ref(props.modelValue ?? false);

const pressed = computed({
	get: () =>
		props.modelValue === undefined ? uncontrolledPressed.value : (props.modelValue ?? false),
	set: (value: boolean) => {
		if (props.modelValue === undefined) uncontrolledPressed.value = value;
		emit('update:modelValue', value);
	},
});
</script>

<template>
	<N8nTooltip v-if="showTooltip" :content="label" :disabled="disabled">
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

		<TogglePrimitive
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
		</TogglePrimitive>
	</N8nTooltip>

	<ToggleGroupItem
		v-else-if="value !== undefined"
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

	<TogglePrimitive
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
	</TogglePrimitive>
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

	height: var(--n8n-button--height);
	padding: var(--n8n-button--padding);
	border-radius: var(--n8n-button--radius);
	font-size: var(--n8n-button--font-size);

	--n8n-button--color--background: transparent;
	--n8n-button--color--background-hover: var(--background--hover);
	--n8n-button--color--background-active: var(--background--active);
	--n8n-button--color: var(--text-color);
	--n8n-button--shadow: 0 0 0 0 transparent;
	--n8n-button--shadow--hover: 0 0 0 0 transparent;
	--n8n-button--shadow--active: 0 0 0 0 transparent;
	--n8n-button--border--shadow: 0 0 0 0 transparent;
	--n8n-button--border--shadow--hover: 0 0 0 0 transparent;
	--n8n-button--border--shadow--active: 0 0 0 0 transparent;
	--n8n-button--border-color: transparent;
	--n8n-button--border-color--hover: transparent;
	--n8n-button--border-color--active: transparent;

	background-color: var(--n8n-button--color--background);
	color: var(--n8n-button--color);
	box-shadow:
		inset var(--n8n-button--border--shadow),
		var(--n8n-button--shadow);
	border: none;

	> * {
		grid-area: 1 / 1;
	}

	&:hover {
		background-color: var(--n8n-button--color--background-hover);
		box-shadow:
			inset var(--n8n-button--border--shadow--hover),
			var(--n8n-button--shadow--hover);
	}

	&:active,
	&[aria-pressed='true'] {
		background-color: var(--n8n-button--color--background-active);
		box-shadow:
			inset var(--n8n-button--border--shadow--active),
			var(--n8n-button--shadow--active);
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		@include focus.focus-ring;
		--n8n-button--border-color: var(--focus--border-color) !important;
	}

	&.xsmall {
		--n8n-button--height: var(--height--xs);
		--n8n-button--padding: 0 var(--spacing--2xs);
		--n8n-button--radius: var(--radius--3xs);
		--n8n-button--font-size: var(--font-size--2xs);
	}

	&.small {
		--n8n-button--height: var(--height--sm);
		--n8n-button--padding: 0 var(--spacing--xs);
		--n8n-button--radius: var(--radius--3xs);
		--n8n-button--font-size: var(--font-size--xs);
	}

	&.medium {
		--n8n-button--height: var(--height--md);
		--n8n-button--padding: 0 var(--spacing--xs);
		--n8n-button--radius: var(--radius--3xs);
		--n8n-button--font-size: var(--font-size--sm);
	}

	&.large {
		--n8n-button--height: var(--height--lg);
		--n8n-button--padding: 0 var(--spacing--sm);
		--n8n-button--radius: var(--radius--2xs);
		--n8n-button--font-size: var(--font-size--sm);
	}

	&.xlarge {
		--n8n-button--height: var(--height--xl);
		--n8n-button--padding: 0 var(--spacing--sm);
		--n8n-button--radius: var(--radius--xs);
		--n8n-button--font-size: var(--font-size--md);
	}

	&.solid {
		--n8n-button--color--background: var(--background--brand);
		--n8n-button--color--background-hover: var(--background--brand--hover);
		--n8n-button--color--background-active: var(--background--brand--active);
		--n8n-button--color: var(--color--neutral-white);
		--n8n-button--shadow: var(--shadow--xs);
		--n8n-button--shadow--hover: var(--shadow--xs);
		--n8n-button--shadow--active: var(--shadow--xs);
		--n8n-button--border-color: var(--background--brand);
		--n8n-button--border-color--hover: var(--background--brand--hover);
		--n8n-button--border-color--active: var(--background--brand--active);
		--n8n-button--border--shadow: 0 0 0 1px var(--n8n-button--border-color);
		--n8n-button--border--shadow--hover: 0 0 0 1px var(--n8n-button--border-color--hover);
		--n8n-button--border--shadow--active: 0 0 0 1px var(--n8n-button--border-color--active);
	}

	&.subtle {
		--n8n-button--color--background: var(--background--surface);
		--n8n-button--color--background-hover: color-mix(
			in srgb,
			var(--n8n-button--color--background),
			var(--background--hover)
		);
		--n8n-button--color--background-active: color-mix(
			in srgb,
			var(--n8n-button--color--background),
			var(--background--active)
		);
		--n8n-button--shadow: var(--shadow--xs);
		--n8n-button--shadow--hover: var(--shadow--xs);
		--n8n-button--shadow--active: var(--shadow--xs);
		--n8n-button--border-color: var(--border-color);
		--n8n-button--border-color--hover: light-dark(
			var(--color--black-alpha-200),
			var(--color--white-alpha-200)
		);
		--n8n-button--border-color--active: light-dark(
			var(--color--black-alpha-300),
			var(--color--white-alpha-300)
		);
		--n8n-button--border--shadow: 0 0 0 1px var(--n8n-button--border-color);
		--n8n-button--border--shadow--hover: 0 0 0 1px var(--n8n-button--border-color--hover);
		--n8n-button--border--shadow--active: 0 0 0 1px var(--n8n-button--border-color--active);
	}

	&.outline {
		--n8n-button--color--background: transparent;
		--n8n-button--border-color: var(--border-color);
		--n8n-button--border-color--hover: light-dark(
			var(--color--black-alpha-200),
			var(--color--white-alpha-200)
		);
		--n8n-button--border-color--active: light-dark(
			var(--color--black-alpha-300),
			var(--color--white-alpha-300)
		);
		--n8n-button--border--shadow: 0 0 0 1px var(--n8n-button--border-color);
		--n8n-button--border--shadow--hover: 0 0 0 1px var(--n8n-button--border-color--hover);
		--n8n-button--border--shadow--active: 0 0 0 1px var(--n8n-button--border-color--active);
	}

	&.ghost {
		--n8n-button--color--background: transparent;
		--n8n-button--border-color: transparent;
		--n8n-button--border--shadow: 0 0 0 1px var(--n8n-button--border-color);
		--n8n-button--border--shadow--hover: 0 0 0 1px var(--n8n-button--border-color);
		--n8n-button--border--shadow--active: 0 0 0 1px var(--n8n-button--border-color);
	}

	&.destructive {
		--n8n-button--color--background: light-dark(var(--color--red-500), var(--color--red-600));
		--n8n-button--color--background-hover: light-dark(var(--color--red-600), var(--color--red-500));
		--n8n-button--color--background-active: light-dark(
			var(--color--red-600),
			var(--color--red-400)
		);
		--n8n-button--color: var(--color--neutral-white);
		--n8n-button--shadow: light-dark(
			0 1px 3px 0 var(--color--black-alpha-100),
			0 1px 3px 0 var(--color--black-alpha-200)
		);
		--n8n-button--shadow--hover: light-dark(
			0 1px 3px 0 var(--color--black-alpha-100),
			0 1px 3px 0 var(--color--black-alpha-200)
		);
		--n8n-button--shadow--active: light-dark(
			0 1px 3px 0 var(--color--black-alpha-100),
			0 1px 3px 0 var(--color--black-alpha-200)
		);
		--n8n-button--border-color: light-dark(var(--color--red-500), var(--color--red-600));
		--n8n-button--border-color--hover: light-dark(var(--color--red-600), var(--color--red-500));
		--n8n-button--border-color--active: light-dark(var(--color--red-600), var(--color--red-400));
		--n8n-button--border--shadow: 0 0 0 1px var(--n8n-button--border-color);
		--n8n-button--border--shadow--hover: 0 0 0 1px var(--n8n-button--border-color--hover);
		--n8n-button--border--shadow--active: 0 0 0 1px var(--n8n-button--border-color--active);
	}

	&.success {
		--n8n-button--color--background: light-dark(var(--color--green-600), var(--color--green-700));
		--n8n-button--color--background-hover: light-dark(
			var(--color--green-700),
			var(--color--green-600)
		);
		--n8n-button--color--background-active: light-dark(
			var(--color--green-700),
			var(--color--green-500)
		);
		--n8n-button--color: var(--color--neutral-white);
		--n8n-button--shadow: light-dark(
			0 1px 3px 0 var(--color--black-alpha-100),
			0 1px 3px 0 var(--color--black-alpha-200)
		);
		--n8n-button--shadow--hover: light-dark(
			0 1px 3px 0 var(--color--black-alpha-100),
			0 1px 3px 0 var(--color--black-alpha-200)
		);
		--n8n-button--shadow--active: light-dark(
			0 1px 3px 0 var(--color--black-alpha-100),
			0 1px 3px 0 var(--color--black-alpha-200)
		);
		--n8n-button--border-color: light-dark(var(--color--green-600), var(--color--green-700));
		--n8n-button--border-color--hover: light-dark(var(--color--green-700), var(--color--green-600));
		--n8n-button--border-color--active: light-dark(
			var(--color--green-700),
			var(--color--green-500)
		);
		--n8n-button--border--shadow: 0 0 0 1px var(--n8n-button--border-color);
		--n8n-button--border--shadow--hover: 0 0 0 1px var(--n8n-button--border-color--hover);
		--n8n-button--border--shadow--active: 0 0 0 1px var(--n8n-button--border-color--active);
	}

	&.disabled {
		opacity: 0.5;
		cursor: not-allowed;

		&:hover {
			background-color: var(--n8n-button--color--background);
			box-shadow:
				inset var(--n8n-button--border--shadow),
				var(--n8n-button--shadow);
		}
	}

	&.iconOnly {
		width: var(--n8n-button--height);
		padding: 0;
		justify-content: center;
		align-items: center;

		> * {
			width: var(--n8n-button--height);
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
