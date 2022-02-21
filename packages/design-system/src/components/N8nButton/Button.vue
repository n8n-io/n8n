<template functional>
	<component
		:is="$options.components.ElButton"
		:plain="props.type === 'outline'"
		:disabled="props.disabled"
		:size="props.size"
		:loading="props.loading"
		:title="props.title || props.label"
		:class="$options.getClass(props, $style)"
		:round="!props.circle && props.round"
		:circle="props.circle"
		:style="$options.styles(props)"
		@click="(e) => listeners.click && listeners.click(e)"
	>
		<span :class="$style.icon" v-if="props.loading || props.icon">
			<component
				:is="$options.components.N8nSpinner"
				v-if="props.loading"
				:size="props.size"
			/>
			<component
				:is="$options.components.N8nIcon"
				v-else-if="props.icon"
				:icon="props.icon"
				:size="props.size"
			/>
		</span>
		<span v-if="props.label">{{ props.label }}</span>
	</component>
</template>

<script lang="ts">
import N8nIcon from '../N8nIcon';
import N8nSpinner from '../N8nSpinner';
import ElButton from 'element-ui/lib/button';

export default {
	name: 'n8n-button',
	props: {
		label: {
			type: String,
		},
		title: {
			type: String,
		},
		type: {
			type: String,
			default: 'primary',
			validator: (value: string): boolean =>
				['primary', 'outline', 'light', 'text'].indexOf(value) !== -1,
		},
		theme: {
			type: String,
			validator: (value: string): boolean =>
				['success', 'warning', 'danger'].indexOf(value) !== -1,
		},
		size: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean =>
				['mini', 'small', 'medium', 'large', 'xlarge'].indexOf(value) !== -1,
		},
		loading: {
			type: Boolean,
			default: false,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		icon: {
			type: String,
		},
		round: {
			type: Boolean,
			default: true,
		},
		circle: {
			type: Boolean,
			default: false,
		},
		float: {
			type: String,
			validator: (value: string): boolean =>
				['left', 'right'].indexOf(value) !== -1,
		},
		fullWidth: {
			type: Boolean,
			default: false,
		},
		transparentBackground: {
			type: Boolean,
			default: false,
		},
	},
	components: {
		ElButton,
		N8nSpinner,
		N8nIcon,
	},
	styles: (props: {
		fullWidth?: boolean;
		float?: string;
	}): { float?: string; width?: string } => {
		return {
			...(props.float ? { float: props.float } : {}),
			...(props.fullWidth ? { width: '100%' } : {}),
		};
	},
	getClass(props: { type: string; theme?: string, transparentBackground: boolean }, $style: any): string {
		const theme = props.type === 'text'
			? 'text'
			: `${props.type}-${props.theme || 'primary'}`;

		if (props.transparentBackground) {
			return `${$style[theme]} ${$style['transparent']}`;
		}

		return $style[theme];
	},
};
</script>

<style lang="scss" module>
@function lightness($h, $s, $l, $lightness) {
	@return hsl(var(#{$h}), var(#{$s}), calc(var(#{$l}) + #{$lightness}));
}

.button {
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

$active-shade-percent: 10%;
$color-primary-shade: lightness(
	--color-primary-h,
	--color-primary-s,
	--color-primary-l,
	-($active-shade-percent)
);

$color-success-shade: lightness(
	--color-success-h,
	--color-success-s,
	--color-success-l,
	-($active-shade-percent)
);

$color-warning-shade: lightness(
	--color-warning-h,
	--color-warning-s,
	--color-warning-l,
	-($active-shade-percent)
);

$color-danger-shade: lightness(
	--color-danger-h,
	--color-danger-s,
	--color-danger-l,
	-($active-shade-percent)
);

.primary-primary {
	composes: button;
}

.primary-success {
	composes: button;
	--button-background-color: var(--color-success);
	--button-color: var(--color-text-xlight);
	--button-border-color: var(--color-success);
	--button-active-color: var(--color-text-xlight);
	--button-active-border-color: #{$color-success-shade};
	--button-active-background-color: #{$color-success-shade};
}

.primary-warning {
	composes: button;
	--button-background-color: var(--color-warning);
	--button-color: var(--color-text-xlight);
	--button-border-color: var(--color-warning);
	--button-active-color: var(--color-text-xlight);
	--button-active-border-color: #{$color-warning-shade};
	--button-active-background-color: #{$color-warning-shade};
}

.primary-danger {
	composes: button;
	--button-background-color: var(--color-danger);
	--button-color: var(--color-text-xlight);
	--button-border-color: var(--color-danger);
	--button-active-color: var(--color-text-xlight);
	--button-active-border-color: #{$color-danger-shade};
	--button-active-background-color: #{$color-danger-shade};
}

.outline {
	--button-background-color: var(--color-foreground-xlight);
	--button-disabled-background-color: var(--color-foreground-xlight);
	--button-active-background-color: var(--color-foreground-xlight);
}

.outline-primary {
	composes: button;
	composes: outline;
	--button-color: var(--color-primary);
	--button-active-border-color: #{$color-primary-shade};
	--button-active-color: #{$color-primary-shade};
}

.outline-success {
	composes: button;
	composes: outline;
	--button-color: var(--color-success);
	--button-border-color: var(--color-success);
	--button-active-color: #{$color-success-shade};
	--button-active-border-color: #{$color-success-shade};
}

.outline-warning {
	composes: button;
	composes: outline;
	--button-color: var(--color-warning);
	--button-border-color: var(--color-warning);
	--button-active-color: #{$color-warning-shade};
	--button-active-border-color: #{$color-warning-shade};
}

.outline-danger {
	composes: button;
	composes: outline;
	--button-color: var(--color-danger);
	--button-border-color: var(--color-danger);
	--button-active-color: #{$color-danger-shade};
	--button-active-border-color: #{$color-danger-shade};
}

.light-primary {
	composes: button;
	--button-color: var(--color-primary);
	--button-border-color: var(--color-primary-tint-2);
	--button-background-color: var(--color-primary-tint-2);
	--button-active-background-color: var(--color-primary-tint-2);
	--button-active-color: #{$color-primary-shade};
	--button-active-border-color: #{$color-primary-shade};
}

.light-success {
	composes: button;
	--button-color: var(--color-success);
	--button-border-color: var(--color-success-tint-1);
	--button-background-color: var(--color-success-tint-1);
	--button-active-background-color: var(--color-success-tint-1);
	--button-active-color: #{$color-success-shade};
	--button-active-border-color: #{$color-success-shade};
}

.light-warning {
	composes: button;
	--button-color: var(--color-warning);
	--button-border-color: var(--color-warning-tint-2);
	--button-background-color: var(--color-warning-tint-2);
	--button-active-background-color: var(--color-warning-tint-2);
	--button-active-color: #{$color-warning-shade};
	--button-active-border-color: #{$color-warning-shade};
}

.light-danger {
	composes: button;
	--button-color: var(--color-danger);
	--button-border-color: var(--color-danger-tint-1);
	--button-background-color: var(--color-danger-tint-1);
	--button-active-background-color: var(--color-danger-tint-1);
	--button-active-color: #{$color-danger-shade};
	--button-active-border-color: #{$color-danger-shade};
}

.text {
	composes: button;
	--button-color: var(--color-text-light);
	--button-border-color: transparent;
	--button-background-color: transparent;
	--button-active-background-color: transparent;
	--button-active-color: var(--color-primary);
	--button-active-border-color: transparent;
}

.transparent {
	--button-background-color: transparent;
	--button-active-background-color: transparent;
}

.icon {
	display: inline-flex;

	svg {
		display: block;
	}
}
</style>
