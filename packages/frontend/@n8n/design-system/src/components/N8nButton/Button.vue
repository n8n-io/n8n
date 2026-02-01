<script setup lang="ts">
import { computed, useAttrs, useCssModule, watchEffect } from 'vue';

import type { IconSize } from '../../types';
import type { ButtonProps } from '../../types/button';
import N8nIcon from '../N8nIcon';
import N8nSpinner from '../N8nSpinner';

const $style = useCssModule();
const attrs = useAttrs();

defineOptions({ name: 'N8nButton' });
const props = withDefaults(defineProps<ButtonProps>(), {
	label: '',
	type: 'primary',
	size: 'medium',
	loading: false,
	disabled: false,
	outline: false,
	text: false,
	block: false,
	active: false,
	square: false,
	element: 'button',
});

watchEffect(() => {
	if (props.element === 'a' && !props.href) {
		console.error('n8n-button:href is required for link buttons');
	}
});

const ariaBusy = computed(() => (props.loading ? 'true' : undefined));
const ariaDisabled = computed(() => (props.disabled ? 'true' : undefined));
const isDisabled = computed(() => props.disabled || props.loading);

const iconSize = computed(
	(): IconSize | undefined =>
		props.iconSize ?? (props.size === 'xmini' || props.size === 'mini' ? 'xsmall' : props.size),
);

const classes = computed(() => {
	return (
		`button ${$style.button} ${$style[props.type]}` +
		`${props.size ? ` ${$style[props.size]}` : ''}` +
		`${props.outline ? ` ${$style.outline}` : ''}` +
		`${props.loading ? ` ${$style.loading}` : ''}` +
		`${props.float ? ` ${$style[`float-${props.float}`]}` : ''}` +
		`${props.text ? ` ${$style.text}` : ''}` +
		`${props.disabled ? ` ${$style.disabled}` : ''}` +
		`${props.block ? ` ${$style.block}` : ''}` +
		`${props.active ? ` ${$style.active}` : ''}` +
		`${props.icon || props.loading ? ` ${$style.withIcon}` : ''}` +
		`${props.square ? ` ${$style.square}` : ''}`
	);
});
</script>

<template>
	<component
		:is="element"
		:class="classes"
		:disabled="isDisabled"
		:aria-disabled="ariaDisabled"
		:aria-busy="ariaBusy"
		:href="href"
		aria-live="polite"
		v-bind="{
			...attrs,
			...(props.nativeType ? { type: props.nativeType } : {}),
		}"
	>
		<span v-if="loading || icon" :class="$style.icon">
			<N8nSpinner v-if="loading" :size="iconSize" />
			<N8nIcon v-else-if="icon" :icon="icon" :size="iconSize" />
		</span>
		<span v-if="label">{{ label }}</span>
		<template v-else-if="$slots.default"><slot /></template>
	</component>
</template>

<style lang="scss">
@use './Button';

.el-button {
	@include Button.n8n-button(true);

	--button--padding--vertical: var(--spacing--2xs);
	--button--padding--horizontal: var(--spacing--xs);
	--button--font-size: var(--font-size--2xs);

	+ .el-button {
		margin-left: var(--spacing--2xs);
	}

	&.btn--cancel,
	&.el-color-dropdown__link-btn {
		@include Button.n8n-button-secondary;
	}
}
</style>

<style lang="scss" module>
@use './Button';
@use '../../css/mixins/utils';
@use '../../css/common/var';

.button {
	@include Button.n8n-button;
}

$loading-overlay-background-color: rgba(255, 255, 255, 0);

/**
 * Colors
 */

.secondary {
	@include Button.n8n-button-secondary;
}

.highlight {
	@include Button.n8n-button-highlight;
}

.highlightFill {
	@include Button.n8n-button-highlight-fill;
}

.tertiary {
	@include Button.n8n-button-secondary;
}

.success {
	@include Button.n8n-button-success;
}

.warning {
	@include Button.n8n-button-warning;
}

.danger {
	@include Button.n8n-button-danger;
}

/**
 * Sizes
 */

.xmini {
	--button--padding--vertical: var(--spacing--4xs);
	--button--padding--horizontal: var(--spacing--3xs);
	--button--font-size: var(--font-size--3xs);

	&.square {
		height: 22px;
		width: 22px;
	}
}

.mini {
	--button--padding--vertical: var(--spacing--4xs);
	--button--padding--horizontal: var(--spacing--2xs);
	--button--font-size: var(--font-size--2xs);

	&.square {
		height: 22px;
		width: 22px;
	}
}

.small {
	--button--padding--vertical: var(--spacing--3xs);
	--button--padding--horizontal: var(--spacing--xs);
	--button--font-size: var(--font-size--2xs);

	&.square {
		height: 26px;
		width: 26px;
	}
}

.medium {
	--button--padding--vertical: var(--spacing--2xs);
	--button--padding--horizontal: var(--spacing--xs);
	--button--font-size: var(--font-size--2xs);

	&.square {
		height: 30px;
		width: 30px;
	}
}

.large {
	&.square {
		height: 42px;
		width: 42px;
	}
}

.xlarge {
	--button--padding--vertical: var(--spacing--xs);
	--button--padding--horizontal: var(--spacing--sm);
	--button--font-size: var(--font-size--md);

	&.square {
		height: 46px;
		width: 46px;
	}
}

/**
 * Modifiers
 */
.outline {
	--button--color--background: transparent;
	--button--color--background--disabled: transparent;

	&.primary {
		--button--color--text: var(--color--primary);
		--button--color--text--disabled: var(--color--primary--tint-1);
		--button--border-color--disabled: var(--color--primary--tint-1);
		--button--color--background--disabled: transparent;
	}

	&.success {
		--button--color--text: var(--color--success);
		--button--border-color: var(--color--success);
		--button--border-color--hover: var(--color--success);
		--button--color--background--hover: var(--color--success);
		--button--color--background--active: var(--color--success);
		--button--color--text--disabled: var(--color--success--tint-1);
		--button--border-color--disabled: var(--color--success--tint-1);
		--button--color--background--disabled: transparent;
	}

	&.warning {
		--button--color--text: var(--color--warning);
		--button--border-color: var(--color--warning);
		--button--border-color--hover: var(--color--warning);
		--button--color--background--hover: var(--color--warning);
		--button--color--background--active: var(--color--warning);
		--button--color--text--disabled: var(--color--warning--tint-1);
		--button--border-color--disabled: var(--color--warning--tint-1);
		--button--color--background--disabled: transparent;
	}

	&.danger {
		--button--color--text: var(--color--danger);
		--button--border-color: var(--color--danger);
		--button--border-color--hover: var(--color--danger);
		--button--color--background--hover: var(--color--danger);
		--button--color--background--active: var(--color--danger);
		--button--color--text--disabled: var(--color--danger--tint-3);
		--button--border-color--disabled: var(--color--danger--tint-3);
		--button--color--background--disabled: transparent;
	}
}

.text {
	--button--color--text: var(--text-button--color--text--secondary);
	--button--border-color: transparent;
	--button--color--background: transparent;
	--button--border-color--hover: transparent;
	--button--color--background--hover: transparent;
	--button--border-color--active: transparent;
	--button--color--background--active: transparent;
	--button--border-color--focus: transparent;
	--button--color--background--focus: transparent;
	--button--border-color--disabled: transparent;
	--button--color--background--disabled: transparent;

	&:focus {
		outline: 0;
	}

	&.primary {
		--button--color--text: var(--color--primary);
		--button--color--text--hover: var(--color--primary--shade-1);
		--button--color--text--active: var(--color--primary--shade-1);
		--button--color--text--focus: var(--color--primary);
		--button--color--text--disabled: var(--color--primary--tint-1);
	}

	&.success {
		--button--color--text: var(--color--success);
		--button--color--text--hover: var(--color--success--shade-1);
		--button--color--text--active: var(--color--success--shade-1);
		--button--color--text--focus: var(--color--success);
		--button--color--text--disabled: var(--color--success--tint-1);
	}

	&.warning {
		--button--color--text: var(--color--warning);
		--button--color--text--hover: var(--color--warning--shade-1);
		--button--color--text--active: var(--color--warning--shade-1);
		--button--color--text--focus: var(--color--warning);
		--button--color--text--disabled: var(--color--warning--tint-1);
	}

	&.danger {
		--button--color--text: var(--color--danger);
		--button--color--text--hover: var(--color--danger--shade-1);
		--button--color--text--active: var(--color--danger--shade-1);
		--button--color--text--focus: var(--color--danger);
		--button--color--text--disabled: var(--color--danger--tint-3);
	}

	&:hover {
		text-decoration: underline;
	}
}

.loading {
	position: relative;
	pointer-events: none;

	&:before {
		pointer-events: none;
		content: '';
		position: absolute;
		left: -1px;
		top: -1px;
		right: -1px;
		bottom: -1px;
		border-radius: inherit;
	}
}

.disabled {
	&,
	&:hover,
	&:active,
	&:focus {
		cursor: not-allowed;
		background-image: none;
	}
}

.transparent {
	--button--color--background: transparent;
	--button--color--background--active: transparent;
}

.withIcon {
	display: inline-flex;
	justify-content: center;
	align-items: center;
}

.icon {
	display: inline-flex;
	justify-content: center;
	align-items: center;

	svg {
		display: block;
	}
}

.block {
	width: 100%;
}

.float-left {
	float: left;
}

.float-right {
	float: right;
}
</style>
