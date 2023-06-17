<template>
	<button
		:class="classes"
		:disabled="disabled || loading"
		:aria-disabled="ariaDisabled"
		:aria-busy="ariaBusy"
		aria-live="polite"
		v-on="$listeners"
	>
		<span :class="$style.icon" v-if="loading || icon">
			<n8n-spinner v-if="loading" :size="size" />
			<n8n-icon v-else-if="icon" :icon="icon" :size="size" />
		</span>
		<span v-if="label || $slots.default">
			<slot>{{ label }}</slot>
		</span>
	</button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import N8nIcon from '../N8nIcon';
import N8nSpinner from '../N8nSpinner';

export default defineComponent({
	name: 'n8n-button',
	props: {
		label: {
			type: String,
		},
		type: {
			type: String,
			default: 'primary',
			validator: (value: string): boolean =>
				['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger'].includes(value),
		},
		size: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean =>
				['xmini', 'mini', 'small', 'medium', 'large', 'xlarge'].includes(value),
		},
		loading: {
			type: Boolean,
			default: false,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		outline: {
			type: Boolean,
			default: false,
		},
		text: {
			type: Boolean,
			default: false,
		},
		icon: {
			type: [String, Array],
		},
		block: {
			type: Boolean,
			default: false,
		},
		active: {
			type: Boolean,
			default: false,
		},
		float: {
			type: String,
			validator: (value: string): boolean => ['left', 'right'].includes(value),
		},
		square: {
			type: Boolean,
			default: false,
		},
	},
	components: {
		N8nSpinner,
		N8nIcon,
	},
	computed: {
		ariaBusy(): 'true' | undefined {
			return this.loading ? 'true' : undefined;
		},
		ariaDisabled(): 'true' | undefined {
			return this.disabled ? 'true' : undefined;
		},
		classes(): string {
			return (
				`button ${this.$style.button} ${this.$style[this.type]}` +
				`${this.size ? ` ${this.$style[this.size]}` : ''}` +
				`${this.outline ? ` ${this.$style.outline}` : ''}` +
				`${this.loading ? ` ${this.$style.loading}` : ''}` +
				`${this.float ? ` ${this.$style[`float-${this.float}`]}` : ''}` +
				`${this.text ? ` ${this.$style.text}` : ''}` +
				`${this.disabled ? ` ${this.$style.disabled}` : ''}` +
				`${this.block ? ` ${this.$style.block}` : ''}` +
				`${this.active ? ` ${this.$style.active}` : ''}` +
				`${this.icon || this.loading ? ` ${this.$style.withIcon}` : ''}` +
				`${this.square ? ` ${this.$style.square}` : ''}`
			);
		},
	},
});
</script>

<style lang="scss" module>
@import '../../css/mixins/utils';
@import '../../css/common/var';

.button {
	display: inline-block;
	line-height: 1;
	white-space: nowrap;
	cursor: pointer;

	border: var(--border-width-base) $button-border-color var(--border-style-base);
	color: $button-font-color;
	background-color: $button-background-color;
	font-weight: var(--font-weight-bold);
	border-radius: $button-border-radius;
	padding: $button-padding-vertical $button-padding-horizontal;
	font-size: $button-font-size;

	-webkit-appearance: none;
	text-align: center;
	box-sizing: border-box;
	outline: none;
	margin: 0;
	transition: 0.3s;

	@include utils-user-select(none);

	&:hover {
		color: $button-hover-color;
		border-color: $button-hover-border-color;
		background-color: $button-hover-background-color;
	}

	&:focus {
		border-color: $button-focus-outline-color;
		outline: $focus-outline-width solid $button-focus-outline-color;
	}

	&:active,
	&.active {
		color: $button-active-color;
		border-color: $button-active-border-color;
		background-color: $button-active-background-color;
		outline: none;
	}

	&::-moz-focus-inner {
		border: 0;
	}

	> i {
		display: none;
	}

	> span {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	span + span {
		margin-left: var(--spacing-3xs);
	}
}

$loading-overlay-background-color: rgba(255, 255, 255, 0);

/**
 * Colors
 */

.secondary {
	--button-color: var(--color-primary);
	--button-border-color: var(--color-primary);
	--button-background-color: var(--color-background-xlight);

	--button-active-background-color: var(--color-primary-tint-2);
	--button-active-color: var(--color-primary);
	--button-active-border-color: var(--color-primary);

	--button-hover-background-color: var(--color-primary-tint-3);
	--button-hover-color: var(--color-primary);
	--button-hover-border-color: var(--color-primary);

	--button-focus-outline-color: var(--color-primary-tint-1);
}

.tertiary {
	font-weight: var(--font-weight-bold) !important;

	--button-background-color: var(--color-background-xlight);
	--button-color: var(--color-text-dark);
	--button-border-color: var(--color-neutral-850);

	--button-active-background-color: var(--color-primary-tint-2);
	--button-active-color: var(--color-primary);
	--button-active-border-color: var(--color-primary);

	--button-hover-background-color: var(--color-neutral-950);
	--button-hover-color: var(--color-text-dark);
	--button-hover-border-color: var(--color-neutral-800);

	--button-focus-outline-color: hsla(
		var(--color-neutral-h),
		var(--color-neutral-s),
		var(--color-neutral-l),
		0.2
	);
}

.success {
	--button-background-color: var(--color-success);
	--button-color: var(--color-text-xlight);
	--button-border-color: var(--color-success);

	--button-active-background-color: var(--color-success-350);
	--button-active-border-color: var(--color-success-350);

	--button-hover-background-color: var(--color-success-450);
	--button-hover-border-color: var(--color-success-450);

	--button-focus-outline-color: hsla(
		var(--color-success-h),
		var(--color-success-s),
		var(--color-success-l),
		0.33
	);
}

.warning {
	--button-background-color: var(--color-warning);
	--button-color: var(--color-text-xlight);
	--button-border-color: var(--color-warning);

	--button-active-background-color: var(--color-warning-500);
	--button-active-border-color: var(--color-warning-500);

	--button-hover-background-color: var(--color-warning-650);
	--button-hover-border-color: var(--color-warning-650);

	--button-focus-outline-color: hsla(
		var(--color-warning-h),
		var(--color-warning-s),
		var(--color-warning-l),
		0.33
	);
}

.danger {
	--button-background-color: var(--color-danger);
	--button-color: var(--color-text-xlight);
	--button-border-color: var(--color-danger);
	--button-active-color: var(--color-text-xlight);

	--button-active-background-color: var(--color-danger-600);
	--button-active-border-color: var(--color-danger-600);

	--button-hover-background-color: var(--color-danger-700);
	--button-hover-border-color: var(--color-danger-700);

	--button-focus-outline-color: hsla(
		var(--color-danger-h),
		var(--color-danger-s),
		var(--color-danger-l),
		0.33
	);
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
	--button-color: var(--color-primary);
	--button-background-color: transparent;
	--button-disabled-background-color: transparent;
	--button-active-background-color: transparent;

	&.primary {
		--button-color: var(--color-primary);
		--button-border-color: var(--color-primary);
		--button-active-background-color: var(--color-primary);
	}

	&.tertiary {
		--button-color: var(--color-text-dark);
	}

	&.success {
		--button-color: var(--color-success);
		--button-border-color: var(--color-success);
		--button-active-background-color: var(--color-success);
	}

	&.warning {
		--button-color: var(--color-warning);
		--button-border-color: var(--color-warning);
		--button-active-background-color: var(--color-warning);
	}

	&.danger {
		--button-color: var(--color-danger);
		--button-border-color: var(--color-danger);
		--button-active-background-color: var(--color-danger);
	}
}

.text {
	--button-color: var(--color-text-light);
	--button-border-color: transparent;
	--button-background-color: transparent;
	--button-active-color: var(--color-text-light);
	--button-active-background-color: transparent;
	--button-active-border-color: transparent;
	--button-hover-color: var(--color-text-light);
	--button-hover-background-color: transparent;
	--button-hover-border-color: transparent;

	&.primary {
		--button-color: var(--color-primary);
		--button-active-color: var(--color-primary);
		--button-hover-color: var(--color-primary);
	}

	&.secondary {
		--button-color: var(--color-primary-tint-1);
		--button-active-color: var(--color-primary-tint-1);
		--button-hover-color: var(--color-primary-tint-1);
	}

	&.success {
		--button-color: var(--color-success);
		--button-active-color: var(--color-success);
		--button-hover-color: var(--color-success);
	}

	&.tertiary {
		--button-hover-color: var(--color-primary);
	}

	&.warning {
		--button-color: var(--color-warning);
		--button-active-color: var(--color-warning);
		--button-hover-color: var(--color-warning);
	}

	&.danger {
		--button-color: var(--color-danger);
		--button-active-color: var(--color-danger);
		--button-hover-color: var(--color-danger);
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
		background-color: $loading-overlay-background-color;
	}
}

.disabled {
	&,
	&:hover,
	&:active,
	&:focus {
		cursor: not-allowed;
		background-image: none;
		color: $button-disabled-font-color;
		background-color: $button-disabled-background-color;
		border-color: $button-disabled-border-color;
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
