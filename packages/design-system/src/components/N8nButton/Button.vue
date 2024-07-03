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
			...$attrs,
			...(props.nativeType ? { type: props.nativeType } : {}),
		}"
	>
		<span v-if="loading || icon" :class="$style.icon">
			<N8nSpinner v-if="loading" :size="size" />
			<N8nIcon v-else-if="icon" :icon="icon" :size="size" />
		</span>
		<span v-if="label || $slots.default">
			<slot>{{ label }}</slot>
		</span>
	</component>
</template>

<script setup lang="ts">
import { useCssModule, computed, useAttrs, watchEffect } from 'vue';
import N8nIcon from '../N8nIcon';
import N8nSpinner from '../N8nSpinner';
import type { ButtonProps } from 'n8n-design-system/types/button';

const $style = useCssModule();
const $attrs = useAttrs();

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

<style lang="scss">
@import './Button';

.el-button {
	@include n8n-button(true);

	--button-padding-vertical: var(--spacing-2xs);
	--button-padding-horizontal: var(--spacing-xs);
	--button-font-size: var(--font-size-2xs);

	+ .el-button {
		margin-left: var(--spacing-2xs);
	}

	&.btn--cancel,
	&.el-color-dropdown__link-btn {
		@include n8n-button-secondary;
	}
}
</style>

<style lang="scss" module>
@import './Button';
@import '../../css/mixins/utils';
@import '../../css/common/var';

.button {
	@include n8n-button;
}

$loading-overlay-background-color: rgba(255, 255, 255, 0);

/**
 * Colors
 */

.secondary {
	@include n8n-button-secondary;
}

.tertiary {
	@include n8n-button-secondary;
}

.success {
	@include n8n-button-success;
}

.warning {
	@include n8n-button-warning;
}

.danger {
	@include n8n-button-danger;
}

/**
 * Sizes
 */

.xmini {
	--button-padding-vertical: var(--spacing-4xs);
	--button-padding-horizontal: var(--spacing-3xs);
	--button-font-size: var(--font-size-3xs);

	&.square {
		height: 22px;
		width: 22px;
	}
}

.mini {
	--button-padding-vertical: var(--spacing-4xs);
	--button-padding-horizontal: var(--spacing-2xs);
	--button-font-size: var(--font-size-2xs);

	&.square {
		height: 22px;
		width: 22px;
	}
}

.small {
	--button-padding-vertical: var(--spacing-3xs);
	--button-padding-horizontal: var(--spacing-xs);
	--button-font-size: var(--font-size-2xs);

	&.square {
		height: 26px;
		width: 26px;
	}
}

.medium {
	--button-padding-vertical: var(--spacing-2xs);
	--button-padding-horizontal: var(--spacing-xs);
	--button-font-size: var(--font-size-2xs);

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
	--button-padding-vertical: var(--spacing-xs);
	--button-padding-horizontal: var(--spacing-s);
	--button-font-size: var(--font-size-m);

	&.square {
		height: 46px;
		width: 46px;
	}
}

/**
 * Modifiers
 */
.outline {
	--button-background-color: transparent;
	--button-disabled-background-color: transparent;

	&.primary {
		--button-font-color: var(--color-primary);
		--button-disabled-font-color: var(--color-primary-tint-1);
		--button-disabled-border-color: var(--color-primary-tint-1);
		--button-disabled-background-color: transparent;
	}

	&.success {
		--button-font-color: var(--color-success);
		--button-border-color: var(--color-success);
		--button-hover-border-color: var(--color-success);
		--button-hover-background-color: var(--color-success);
		--button-active-background-color: var(--color-success);
		--button-disabled-font-color: var(--color-success-light);
		--button-disabled-border-color: var(--color-success-light);
		--button-disabled-background-color: transparent;
	}

	&.warning {
		--button-font-color: var(--color-warning);
		--button-border-color: var(--color-warning);
		--button-hover-border-color: var(--color-warning);
		--button-hover-background-color: var(--color-warning);
		--button-active-background-color: var(--color-warning);
		--button-disabled-font-color: var(--color-warning-tint-1);
		--button-disabled-border-color: var(--color-warning-tint-1);
		--button-disabled-background-color: transparent;
	}

	&.danger {
		--button-font-color: var(--color-danger);
		--button-border-color: var(--color-danger);
		--button-hover-border-color: var(--color-danger);
		--button-hover-background-color: var(--color-danger);
		--button-active-background-color: var(--color-danger);
		--button-disabled-font-color: var(--color-danger-tint-1);
		--button-disabled-border-color: var(--color-danger-tint-1);
		--button-disabled-background-color: transparent;
	}
}

.text {
	--button-font-color: var(--color-text-button-secondary-font);
	--button-border-color: transparent;
	--button-background-color: transparent;
	--button-hover-border-color: transparent;
	--button-hover-background-color: transparent;
	--button-active-border-color: transparent;
	--button-active-background-color: transparent;
	--button-focus-border-color: transparent;
	--button-focus-background-color: transparent;
	--button-disabled-border-color: transparent;
	--button-disabled-background-color: transparent;

	&:focus {
		outline: 0;
	}

	&.primary {
		--button-font-color: var(--color-primary);
		--button-hover-font-color: var(--color-primary-shade-1);
		--button-active-font-color: var(--color-primary-shade-1);
		--button-focus-font-color: var(--color-primary);
		--button-disabled-font-color: var(--color-primary-tint-1);
	}

	&.success {
		--button-font-color: var(--color-success);
		--button-hover-font-color: var(--color-success-shade-1);
		--button-active-font-color: var(--color-success-shade-1);
		--button-focus-font-color: var(--color-success);
		--button-disabled-font-color: var(--color-success-light);
	}

	&.warning {
		--button-font-color: var(--color-warning);
		--button-hover-font-color: var(--color-warning-shade-1);
		--button-active-font-color: var(--color-warning-shade-1);
		--button-focus-font-color: var(--color-warning);
		--button-disabled-font-color: var(--color-warning-tint-1);
	}

	&.danger {
		--button-font-color: var(--color-danger);
		--button-hover-font-color: var(--color-danger-shade-1);
		--button-active-font-color: var(--color-danger-shade-1);
		--button-focus-font-color: var(--color-danger);
		--button-disabled-font-color: var(--color-danger-tint-1);
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
	--button-background-color: transparent;
	--button-active-background-color: transparent;
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
