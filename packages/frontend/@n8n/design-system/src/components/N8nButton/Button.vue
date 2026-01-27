<script setup lang="ts">
import { computed, useAttrs, useCssModule, watchEffect } from 'vue';

import type { IconSize } from '../../types';
import type { ButtonProps } from '../../types/button';
import { cn } from '../../utils/cn';
import N8nIcon from '../N8nIcon';
import {
	computeEffectiveVariant,
	computeEffectiveSize,
	isCurrentVariant,
	logLegacyPropWarnings,
} from './Button.legacy';

const $style = useCssModule();
const attrs = useAttrs();

defineOptions({
	name: 'N8nButton',
	inheritAttrs: false,
});

const props = withDefaults(defineProps<ButtonProps>(), {
	loading: false,
	disabled: false,
	outline: false,
	text: false,
	block: false,
	active: false,
	square: false,
});

if (import.meta.env.DEV) {
	watchEffect(() => {
		logLegacyPropWarnings(props, attrs as Record<string, unknown>);
	});
}

const effectiveVariant = computed(() => computeEffectiveVariant(props));
const effectiveSize = computed(() => computeEffectiveSize(props.size));
const isIconOnly = computed(() => props.iconOnly || props.square);
const iconToRender = computed(() => props.icon);
const hasIcon = computed(() => Boolean(iconToRender.value));

const computedIconSize = computed((): IconSize | undefined => {
	if (props.iconSize) return props.iconSize;
	if (props.size === 'xmini' || props.size === 'mini' || effectiveSize.value === 'xsmall') {
		return 'xsmall';
	}
	return effectiveSize.value as IconSize;
});

const componentTag = computed(() => {
	if (props.href) return 'a';
	return props.element ?? 'button';
});

const buttonType = computed(() => {
	if (componentTag.value === 'a') return undefined;
	return props.nativeType ?? (attrs.type as string | undefined) ?? 'button';
});

const isDisabled = computed(() => props.disabled || props.loading);

const classes = computed(() => {
	const isCurrent = isCurrentVariant(effectiveVariant.value);

	if (isCurrent) {
		return cn(
			'button',
			$style.button,
			$style[effectiveVariant.value],
			$style[effectiveSize.value ?? 'medium'],
			props.loading && $style.loading,
			isIconOnly.value && $style.iconOnly,
			props.disabled && $style.disabled,
			props.block && $style.block,
			props.active && $style.active,
			props.float && $style[`float-${props.float}`],
			hasIcon.value && $style.withIcon,
		);
	}

	return cn(
		'button',
		$style.button,
		$style.legacyCompat,
		$style[effectiveVariant.value],
		$style[effectiveSize.value ?? 'medium'],
		props.outline && $style.outline,
		props.text && $style.text,
		props.loading && $style.loading,
		isIconOnly.value && $style.square,
		props.disabled && $style.disabled,
		props.block && $style.block,
		props.active && $style.active,
		props.float && $style[`float-${props.float}`],
		hasIcon.value && $style.withIcon,
	);
});

const handleClick = (event: MouseEvent) => {
	if (props.href && isDisabled.value) {
		event.preventDefault();
	}
};
</script>

<template>
	<component
		:is="componentTag"
		:type="buttonType"
		:href="href"
		:rel="href ? 'nofollow noopener noreferrer' : undefined"
		:disabled="componentTag === 'button' ? isDisabled || undefined : undefined"
		:aria-disabled="isDisabled || undefined"
		:aria-busy="loading || undefined"
		:class="classes"
		aria-live="polite"
		v-bind="attrs"
		@click="handleClick"
	>
		<Transition name="n8n-button-fade">
			<div v-if="loading" :class="$style['loading-container']">
				<div :class="$style['loading-spinner']">
					<N8nIcon icon="loader" :size="computedIconSize" transform-origin="center" />
				</div>
			</div>
		</Transition>

		<div :class="$style['button-inner']">
			<slot name="icon">
				<N8nIcon v-if="iconToRender && !loading" :icon="iconToRender" :size="computedIconSize" />
			</slot>

			<span v-if="label">{{ label }}</span>
			<slot v-else />
		</div>
	</component>
</template>

<style lang="scss">
@use './Button.legacy' as Legacy;

// Element Plus button compatibility (legacy)
.el-button {
	@include Legacy.el-button-compat;
}
</style>

<style lang="scss" module>
@use './Button.legacy' as Legacy;
@use '../../css/mixins/focus';

.button {
	appearance: none;
	touch-action: manipulation;
	-webkit-tap-highlight-color: transparent;
	user-select: none;
	width: fit-content;
	display: grid;
	border: none;
	font-weight: var(--font-weight--medium);
	line-height: 1;
	cursor: pointer;
	text-decoration: none;

	height: var(--button--height);
	padding: var(--button--padding);
	border-radius: var(--button--radius);
	font-size: var(--button--font-size);

	--button--color--background: transparent;
	--button--color--background-hover: transparent;
	--button--color--background-active: transparent;
	--button--color: light-dark(var(--color--neutral-900), var(--color--neutral-100));
	--button--shadow: none;
	--button--shadow--hover: none;
	--button--shadow--active: none;

	background-color: var(--button--color--background);
	color: var(--button--color);
	box-shadow: var(--button--shadow);

	> * {
		grid-area: 1 / 1;
	}

	&:hover {
		background-color: var(--button--color--background-hover);
		box-shadow: var(--button--shadow--hover);
	}

	&:active {
		background-color: var(--button--color--background-active);
		box-shadow: var(--button--shadow--active);
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		@include focus.focus-ring;
	}

	&.xsmall {
		--button--height: 1.5rem;
		--button--padding: 0 var(--spacing--2xs);
		--button--radius: var(--radius--2xs);
		--button--font-size: var(--font-size--2xs);
	}

	&.small {
		--button--height: 1.75rem;
		--button--padding: 0 var(--spacing--xs);
		--button--radius: var(--radius--2xs);
		--button--font-size: var(--font-size--xs);
	}

	&.medium {
		--button--height: 2.25rem;
		--button--padding: 0 var(--spacing--xs);
		--button--radius: var(--radius--xs);
		--button--font-size: var(--font-size--sm);
	}

	&.large,
	&.xlarge {
		--button--height: 2.625rem;
		--button--padding: 0 var(--spacing--sm);
		--button--radius: var(--radius--xs);
		--button--font-size: var(--font-size--md);
	}

	&.solid {
		--button--color--background: var(--color--orange-400);
		--button--color--background-hover: var(--color--orange-500);
		--button--color--background-active: var(--color--orange-600);
		--button--color: var(--color--neutral-white);
		--button--shadow:
			0 1px 3px 0 light-dark(var(--color--black-alpha-100), var(--color--black-alpha-200)),
			0 0 0 1px var(--color--orange-400);
		--button--shadow--hover:
			0 1px 3px 0 light-dark(var(--color--black-alpha-100), var(--color--black-alpha-200)),
			0 0 0 1px var(--color--orange-500);
		--button--shadow--active:
			0 1px 3px 0 light-dark(var(--color--black-alpha-100), var(--color--black-alpha-200)),
			0 0 0 1px var(--color--orange-600);
	}

	&.subtle {
		--button--color--background: light-dark(var(--color--neutral-white), var(--color--neutral-800));
		--button--color--background-hover: light-dark(
			var(--color--neutral-200),
			var(--color--neutral-700)
		);
		--button--color--background-active: light-dark(
			var(--color--neutral-250),
			var(--color--neutral-600)
		);
		--button--shadow:
			0 1px 3px 0 light-dark(var(--color--black-alpha-200), var(--color--black-alpha-300)),
			0 0 0 1px light-dark(var(--color--black-alpha-100), var(--color--white-alpha-100)),
			0 0 0 2px light-dark(transparent, var(--color--black-alpha-100));
		--button--shadow--hover:
			0 1px 3px 0 light-dark(var(--color--black-alpha-200), var(--color--black-alpha-300)),
			0 0 0 1px light-dark(var(--color--black-alpha-200), var(--color--white-alpha-300)),
			0 0 0 2px light-dark(transparent, var(--color--black-alpha-100));
		--button--shadow--active:
			0 1px 3px 0 light-dark(var(--color--black-alpha-200), var(--color--black-alpha-300)),
			0 0 0 1px light-dark(var(--color--black-alpha-300), var(--color--white-alpha-300)),
			0 0 0 2px light-dark(transparent, var(--color--black-alpha-100));
	}

	&.outline {
		--button--color--background: transparent;
		--button--color--background-hover: light-dark(
			var(--color--black-alpha-200),
			var(--color--white-alpha-100)
		);
		--button--color--background-active: light-dark(
			var(--color--black-alpha-300),
			var(--color--white-alpha-200)
		);
		--button--shadow: 0 0 0 1px
			light-dark(var(--color--black-alpha-100), var(--color--white-alpha-100));
		--button--shadow--hover: 0 0 0 1px
			light-dark(var(--color--black-alpha-200), var(--color--white-alpha-200));
		--button--shadow--active: 0 0 0 1px
			light-dark(var(--color--black-alpha-300), var(--color--white-alpha-300));
	}

	&.ghost {
		--button--color--background: transparent;
		--button--color--background-hover: light-dark(
			var(--color--black-alpha-200),
			var(--color--white-alpha-100)
		);
		--button--color--background-active: light-dark(
			var(--color--black-alpha-300),
			var(--color--white-alpha-200)
		);
		--button--shadow: 0 0 0 0 transparent;
		--button--shadow--hover: 0 0 0 1px
			light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
		--button--shadow--active: 0 0 0 1px
			light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
	}

	&.destructive {
		--button--color--background: light-dark(var(--color--red-500), var(--color--red-600));
		--button--color--background-hover: light-dark(var(--color--red-600), var(--color--red-500));
		--button--color--background-active: light-dark(var(--color--red-600), var(--color--red-400));
		--button--color: var(--color--neutral-white);
		--button--shadow:
			light-dark(
				0 1px 3px 0 var(--color--black-alpha-100),
				0 1px 3px 0 var(--color--black-alpha-200)
			),
			0 0 0 1px light-dark(var(--color--red-500), var(--color--red-600));
		--button--shadow--hover:
			light-dark(
				0 1px 3px 0 var(--color--black-alpha-100),
				0 1px 3px 0 var(--color--black-alpha-200)
			),
			0 0 0 1px light-dark(var(--color--red-600), var(--color--red-500));
		--button--shadow--active:
			light-dark(
				0 1px 3px 0 var(--color--black-alpha-100),
				0 1px 3px 0 var(--color--black-alpha-200)
			),
			0 0 0 1px light-dark(var(--color--red-600), var(--color--red-400));
	}

	&.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	&.loading {
		pointer-events: none;
	}

	&.iconOnly {
		width: var(--button--height);
		padding: 0;
	}

	@include Legacy.legacy-compat-styles;
}

.loading-container {
	height: auto;
	display: flex;
	align-items: center;
	justify-content: center;
}

.button-inner {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
}

.loading-container + .button-inner {
	pointer-events: none;
	opacity: 0;
}

.loading-spinner {
	display: flex;
	align-items: center;
	justify-content: center;
	animation: spin 1s linear infinite;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

/* TODO: Move to global animations css library */
:global(.n8n-button-fade-enter-active),
:global(.n8n-button-fade-leave-active) {
	--easing--ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
	transition:
		opacity 0.2s var(--easing--ease-out),
		transform 0.2s var(--easing--ease-out);

	@media (prefers-reduced-motion: reduce) {
		transition: opacity 0.1s;
	}
}

:global(.n8n-button-fade-enter-from),
:global(.n8n-button-fade-leave-to) {
	opacity: 0;
	transform: translateY(4px);
	filter: blur(2px);

	@media (prefers-reduced-motion: reduce) {
		transform: none;
		filter: none;
	}
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.block {
	width: 100%;
}

.active {
}

.float-left {
	float: left;
}

.float-right {
	float: right;
}

.withIcon {
	display: inline-flex;
	justify-content: center;
	align-items: center;
}
</style>
