<script lang="ts" setup>
import { computed, useAttrs, useCssModule } from 'vue';
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

if (import.meta.env.DEV && props.icon) {
	const hasAccessibleLabel = attrs['aria-label'] || attrs['aria-labelledby'] || attrs.title;
	if (!hasAccessibleLabel) {
		console.warn(
			'[Button] Icon-only buttons should have an accessible label. ' +
				'Add aria-label, aria-labelledby, or title attribute.',
		);
	}
}

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
</script>

<template>
	<component
		:is="componentTag"
		:href="href"
		:target="href ? '_blank' : undefined"
		:rel="href ? 'nofollow noopener' : undefined"
		:disabled="disabled || undefined"
		:aria-disabled="disabled || undefined"
		:class="classes"
		v-bind="attrs"
	>
		<Transition name="fade">
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
	-webkit-appearance: none;
	touch-action: manipulation;
	-webkit-tap-highlight-color: transparent;
	user-select: none;
	width: fit-content;
	display: grid;
	border: none;
	font-weight: var(--font-weight--medium);
	line-height: 1lh;
	cursor: pointer;
	transform: scale(1);
	text-decoration: none;
	height: var(--button--height);
	padding: var(--button--padding);
	border-radius: var(--button--radius);
	font-size: var(--button--font-size);

	> * {
		grid-area: 1 / 1;
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

	&.solid {
		background-color: var(--color--orange-400);
		color: var(--color--neutral-white);
		box-shadow:
			0 1px 2px 0 rgba(0, 0, 0, 0.08),
			0 0 0 1px var(--color--orange-400);

		&:hover {
			background-color: var(--color--orange-500);
			box-shadow:
				0 1px 2px 0 rgba(0, 0, 0, 0.08),
				0 0 0 1px var(--color--orange-500);
		}

		&:active {
			background-color: var(--color--orange-600);
			box-shadow:
				0 1px 2px 0 rgba(0, 0, 0, 0.08),
				0 0 0 1px var(--color--orange-600);
		}
	}

	&.subtle {
		background-color: var(--color--neutral-200);
		color: var(--color--neutral-900);
		box-shadow: 0 0 0 1px var(--color--neutral-200);

		&:hover {
			background-color: var(--color--neutral-250);
			box-shadow: 0 0 0 1px var(--color--neutral-250);
		}

		&:active {
			background-color: var(--color--neutral-300);
			box-shadow: 0 0 0 1px var(--color--neutral-300);
		}
	}

	&.outline {
		background-color: var(--color--neutral-white);
		color: var(--color--neutral-900);
		box-shadow:
			0 1px 3px 0 rgba(0, 0, 0, 0.1),
			0 0 0 1px var(--border-color);

		&:hover {
			background-color: var(--color--neutral-100);
			box-shadow:
				0 1px 3px 0 rgba(0, 0, 0, 0.1),
				0 0 0 1px var(--border-color--strong);
		}

		&:active {
			background-color: var(--color--neutral-150);
			box-shadow:
				0 1px 3px 0 rgba(0, 0, 0, 0.1),
				0 0 0 1px var(--border-color--strong);
		}
	}

	&.ghost {
		background-color: transparent;
		color: var(--color--neutral-900);
		box-shadow: 0 0 0 0 transparent;

		&:hover {
			background-color: var(--color--black-alpha-200);
			box-shadow: 0 0 0 1px var(--color--black-alpha-200);
		}

		&:active {
			background-color: var(--color--black-alpha-300);
			box-shadow: 0 0 0 1px var(--color--black-alpha-300);
		}
	}

	&.destructive {
		background-color: var(--color--red-500);
		color: var(--color--neutral-white);
		box-shadow:
			0 1px 2px 0 rgba(0, 0, 0, 0.08),
			0 0 0 1px var(--color--red-500);

		&:hover {
			background-color: var(--color--red-600);
			box-shadow:
				0 1px 2px 0 rgba(0, 0, 0, 0.08),
				0 0 0 1px var(--color--red-600);
		}

		&:active {
			background-color: var(--color--red-600);
			box-shadow:
				0 1px 2px 0 rgba(0, 0, 0, 0.08),
				0 0 0 1px var(--color--red-600);
		}
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
	width: 16px;
	height: 16px;
	animation: spin 1s linear infinite;
}

/* TODO: Move to global animations css library */
:global(.fade-enter-active),
:global(.fade-leave-active) {
	--easing--ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
	transition:
		opacity 0.2s var(--easing--ease-out),
		transform 0.2s var(--easing--ease-out);
}
:global(.fade-enter-from),
:global(.fade-leave-to) {
	opacity: 0;
	transform: translateY(4px);
	filter: blur(2px);
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
