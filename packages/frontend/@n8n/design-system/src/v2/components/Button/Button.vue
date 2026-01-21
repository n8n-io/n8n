<script lang="ts" setup>
import { computed, useAttrs, useCssModule, onMounted } from 'vue';
import type { ButtonHTMLAttributes } from 'vue';

import { N8nIcon } from '@n8n/design-system/components';
import { cn } from '@n8n/design-system/utils/cn';

interface Props extends /* @vue-ignore */ ButtonHTMLAttributes {
	/** Determines the type of button, typically the intent of the action */
	variant?: 'solid' | 'subtle' | 'ghost' | 'outline' | 'destructive';
	/** Determines the size of the button */
	size?: 'xsmall' | 'small' | 'medium';
	/** If passed, the button will be rendered as a link */
	href?: string;
	/** If passed, the button will be rendered as a loading state */
	loading?: boolean;
	/** If true, forces equal width and height (square button for icons) */
	icon?: boolean;
	/** If true, the button will be disabled */
	disabled?: boolean;
	/** Additional classes to apply to the button */
	class?: string;
}

defineOptions({
	inheritAttrs: false,
});

const props = withDefaults(defineProps<Props>(), {
	variant: 'outline',
	size: 'small',
	href: undefined,
	loading: false,
	icon: false,
	disabled: false,
	class: undefined,
});

const $style = useCssModule();
const attrs = useAttrs() as ButtonHTMLAttributes;

onMounted(() => {
	if (import.meta.env.DEV && props.icon) {
		const hasAccessibleLabel = attrs['aria-label'] || attrs['aria-labelledby'] || attrs.title;
		if (!hasAccessibleLabel) {
			console.warn(
				'[Button] Icon-only buttons should have an accessible label. ' +
					'Add aria-label, aria-labelledby, or title attribute.',
			);
		}
	}
});

const classes = computed(() =>
	cn(
		$style.button,
		$style[props.variant],
		$style[props.size],
		props.loading && $style.loading,
		props.icon && $style.icon,
		props.disabled && $style.disabled,
		props.class,
	),
);

const componentTag = computed(() => (props.href ? 'a' : 'button'));

const buttonType = computed(() => {
	if (props.href) return undefined;
	return (attrs.type as string) ?? 'button';
});

const handleClick = (event: MouseEvent) => {
	if (props.href && props.disabled) {
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
		:disabled="disabled || loading || undefined"
		:aria-disabled="disabled || loading || undefined"
		:class="classes"
		v-bind="attrs"
		@click="handleClick"
	>
		<Transition name="n8n-button-fade">
			<div v-if="loading" :class="$style['loading-container']">
				<div :class="$style['loading-spinner']">
					<N8nIcon icon="loader" size="large" transform-origin="center" />
				</div>
			</div>
		</Transition>
		<div :class="$style['button-inner']">
			<slot />
		</div>
	</component>
</template>

<style lang="scss" module>
@use '../../../css/mixins/focus';

.button {
	appearance: none;
	touch-action: manipulation;
	-webkit-tap-highlight-color: transparent;
	user-select: none;
	width: fit-content;
	display: grid;
	border: none;
	font-weight: var(--font-weight--medium);
	line-height: 1lh;
	cursor: pointer;
	text-decoration: none;

	// Size variables
	height: var(--button--height);
	padding: var(--button--padding);
	border-radius: var(--button--radius);
	font-size: var(--button--font-size);

	// Variant variables with defaults
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

	// Size variants
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

	// Style variants
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

	&.link {
		cursor: pointer;
	}

	&.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	&.loading {
		pointer-events: none;
	}

	&.icon {
		width: var(--button--height);
		padding: 0;
	}
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
	width: var(--spacing--sm);
	height: var(--spacing--sm);
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
</style>
