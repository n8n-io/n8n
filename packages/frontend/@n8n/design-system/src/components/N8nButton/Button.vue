<script setup lang="ts">
import { computed, useAttrs, useCssModule, watchEffect } from 'vue';

import type { IconSize } from '../../types';
import type { ButtonProps } from '../../types/button';
import { cn } from '../../utils/cn';
import N8nIcon from '../N8nIcon';
import N8nSpinner from '../N8nSpinner';

const $style = useCssModule();
const attrs = useAttrs();

defineOptions({
	name: 'N8nButton',
	inheritAttrs: false,
});

const props = withDefaults(defineProps<ButtonProps>(), {
	variant: 'solid',
	size: 'medium',
	loading: false,
	disabled: false,
	focusableWhenDisabled: false,
});

// Map legacy size values to current ones
const effectiveSize = computed(() => {
	if (props.size === 'mini' || props.size === 'xmini') return 'xsmall';
	return props.size;
});

const computedIconSize = computed((): IconSize | undefined => {
	if (props.iconSize) return props.iconSize;
	if (effectiveSize.value === 'xsmall') return 'xsmall';
	return effectiveSize.value;
});

const componentTag = computed(() => {
	if (props.href) return 'a';
	return 'button';
});

const buttonType = computed(() => {
	if (componentTag.value === 'a') return undefined;
	return (attrs.type as string | undefined) ?? 'button';
});

const isDisabled = computed(() => props.disabled || props.loading);
const isFocusableDisabled = computed(
	() =>
		componentTag.value === 'button' &&
		props.disabled &&
		props.focusableWhenDisabled &&
		!props.loading,
);

const classes = computed(() =>
	cn(
		'button',
		$style.button,
		$style[props.variant],
		$style[effectiveSize.value],
		props.loading && $style.loading,
		props.iconOnly && $style.iconOnly,
		props.disabled && $style.disabled,
		isDisabled.value && 'is-disabled',
		props.class,
	),
);

// Accessibility warning for icon-only buttons without accessible labels
if (import.meta.env.DEV) {
	watchEffect(() => {
		if (props.iconOnly && !attrs['aria-label'] && !attrs.title) {
			console.warn(
				'[N8nButton] Icon-only buttons should have an accessible label. ' +
					'Add aria-label or title attribute.',
			);
		}
	});
}

const handleClick = (event: MouseEvent) => {
	if (props.href && isDisabled.value) {
		event.preventDefault();
	}
};

const blockDisabledActivation = (event: Event) => {
	if (!isFocusableDisabled.value) return;

	// aria-disabled does not block handlers or the native form action.
	event.preventDefault();
	event.stopImmediatePropagation();
};

const blockDisabledKeyActivation = (event: KeyboardEvent) => {
	if (event.key === 'Enter' || event.key === ' ') {
		blockDisabledActivation(event);
	}
};

// Capture guards run before consumer handlers and handlers on slot content.
const disabledActivationListeners = computed(() =>
	isFocusableDisabled.value
		? {
				clickCapture: blockDisabledActivation,
				keydownCapture: blockDisabledKeyActivation,
				keyupCapture: blockDisabledKeyActivation,
			}
		: {},
);
</script>

<template>
	<component
		:is="componentTag"
		v-on="disabledActivationListeners"
		v-bind="attrs"
		:type="buttonType"
		:href="href"
		:rel="href ? 'nofollow noopener noreferrer' : undefined"
		:disabled="
			componentTag === 'button' ? (isDisabled && !isFocusableDisabled) || undefined : undefined
		"
		:aria-disabled="isDisabled || undefined"
		:aria-busy="loading || undefined"
		:tabindex="componentTag === 'a' && isDisabled ? -1 : attrs.tabindex"
		:class="classes"
		:data-icon-only="iconOnly ? 'true' : undefined"
		:aria-live="attrs['aria-live'] ?? 'polite'"
		@click="handleClick"
	>
		<div v-if="loading" :class="$style['loading-container']">
			<N8nSpinner type="dots" :size="computedIconSize" aria-hidden="true" />
		</div>

		<div :class="$style['button-inner']">
			<slot name="icon">
				<N8nIcon v-if="icon" :icon="icon" :fallback-icon="fallbackIcon" :size="computedIconSize" />
			</slot>

			<span v-if="label">{{ label }}</span>
			<slot v-else />
		</div>
	</component>
</template>

<style lang="scss">
// Import legacy override classes (n8n-button--success, n8n-button--warning, etc.)
// These are global classes added by the migration codemod for legacy button types
@use './Button.legacy';
</style>

<style lang="scss" module>
@use '../../css/mixins/focus';

.button {
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
	border-radius: var(--radius--full);
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
	&[aria-expanded='true'],
	:global([aria-expanded='true']) & {
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
		--n8n-button--radius: var(--radius--xs);
		--n8n-button--font-size: var(--font-size--2xs);
	}

	&.small {
		--n8n-button--height: var(--height--sm);
		--n8n-button--padding: 0 var(--spacing--xs);
		--n8n-button--radius: var(--radius--xs);
		--n8n-button--font-size: var(--font-size--xs);
	}

	&.medium {
		--n8n-button--height: var(--height--md);
		--n8n-button--padding: 0 var(--spacing--xs);
		--n8n-button--radius: var(--radius--xs);
		--n8n-button--font-size: var(--font-size--sm);
	}

	&.large {
		--n8n-button--height: var(--height--lg);
		--n8n-button--padding: 0 var(--spacing--sm);
		--n8n-button--radius: var(--radius--sm);
		--n8n-button--font-size: var(--font-size--sm);
	}

	&.xlarge {
		--n8n-button--height: var(--height--xl);
		--n8n-button--padding: 0 var(--spacing--sm);
		--n8n-button--radius: var(--radius--sm);
		--n8n-button--font-size: var(--font-size--md);
	}

	&.solid {
		--n8n-button--color--background: var(--color--primary);
		--n8n-button--color--background-hover: color-mix(
			in srgb,
			var(--color--primary),
			light-dark(var(--color--neutral-white), var(--color--neutral-black)) 10%
		);
		--n8n-button--color--background-active: color-mix(
			in srgb,
			var(--color--primary),
			light-dark(var(--color--neutral-white), var(--color--neutral-black)) 12%
		);
		--n8n-button--color: var(--text-color--inverse);
		--n8n-button--border-color: var(--color--primary);
		--n8n-button--border-color--hover: color-mix(
			in srgb,
			var(--n8n-button--border-color),
			light-dark(var(--color--neutral-white), var(--color--neutral-black)) 10%
		);
		--n8n-button--border-color--active: color-mix(
			in srgb,
			var(--n8n-button--border-color),
			light-dark(var(--color--neutral-white), var(--color--neutral-black)) 12%
		);
		--n8n-button--border--shadow: 0 0 0 1px var(--n8n-button--border-color);
		--n8n-button--border--shadow--hover: 0 0 0 1px var(--n8n-button--border-color--hover);
		--n8n-button--border--shadow--active: 0 0 0 1px var(--n8n-button--border-color--active);
	}

	&.brand {
		--n8n-button--color--background: var(--background--brand);
		--n8n-button--color--background-hover: var(--background--brand--hover);
		--n8n-button--color--background-active: var(--background--brand--active);
		--n8n-button--color: var(--color--neutral-black);
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

	&.outline {
		--n8n-button--color--background: var(--background--surface);
		--n8n-button--color--background-hover: color-mix(
			in srgb,
			var(--n8n-button--color--background),
			light-dark(var(--color--neutral-black), var(--color--neutral-white)) 5%
		);
		--n8n-button--color--background-active: color-mix(
			in srgb,
			var(--n8n-button--color--background),
			light-dark(var(--color--neutral-black), var(--color--neutral-white)) 10%
		);
		--n8n-button--border-color: var(--border-color);
		--n8n-button--border-color--hover: color-mix(
			in srgb,
			var(--n8n-button--border-color),
			light-dark(var(--color--neutral-black), var(--color--neutral-white)) 5%
		);
		--n8n-button--border-color--active: color-mix(
			in srgb,
			var(--n8n-button--border-color),
			light-dark(var(--color--neutral-black), var(--color--neutral-white)) 10%
		);
		--n8n-button--shadow: var(--shadow--xs);
		--n8n-button--shadow--hover: var(--shadow--xs);
		--n8n-button--shadow--active: var(--shadow--xs);
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

	// Anchor and clip the spinner until its exit animation ends, so its slide adds no scrollbar.
	&:has(> .loading-container) {
		position: relative;
		overflow: clip;
	}

	&.loading {
		pointer-events: none;
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

// Cover the whole button so the spinner stays centered, also in an inline-flex dropdown trigger.
.loading-container {
	position: absolute;
	inset: 0;
	grid-area: auto;
	display: flex;
	align-items: center;
	justify-content: center;
}

.button-inner {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
	white-space: nowrap;

	/** NOTE (@heymynameisrob): Covers legacy prop label which wraps in span **/
	> span {
		white-space: nowrap;
	}
}

// Hide the content but keep it in layout, so a loading button keeps its width.
.loading-container + .button-inner {
	pointer-events: none;
	opacity: 0;
}
</style>
