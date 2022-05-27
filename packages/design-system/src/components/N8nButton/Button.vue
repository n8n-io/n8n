<template functional>
	<component
		:is="$options.components.ElButton"
		:plain="props.outline"
		:disabled="props.disabled"
		:size="props.size"
		:loading="props.loading"
		:title="props.title || props.label"
		:class="$options.getClass(props, $style)"
		:round="!props.circle && props.round"
		:circle="props.circle"
		:style="$options.styles(props)"
		tabindex="0"
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
		<span v-if="props.label">
			<slot>{{ props.label }}</slot>
		</span>
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
				['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger'].includes(value),
		},
		size: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean =>
				['mini', 'small', 'medium', 'large', 'xlarge'].includes(value),
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
		},
		round: {
			type: Boolean,
			default: false,
		},
		circle: {
			type: Boolean,
			default: false,
		},
		float: {
			type: String,
			validator: (value: string): boolean =>
				['left', 'right'].includes(value),
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
	getClass(props: { type: string; outline: boolean; text: boolean; transparentBackground: boolean }, $style: any): string {
		return `${$style['button']} ${$style[props.type]}` +
			`${props.transparentBackground ? ` ${$style['transparent']}` : ''}` +
			`${props.outline ? ` ${$style['outline']}` : ''}` +
			`${props.text ? ` ${$style['text']}` : ''}`;
	},
};
</script>

<style lang="scss" module>
@import "../../utils";

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

.secondary {
  --button-color: var(--color-primary);
  --button-border-color: var(--color-primary);
  --button-background-color: var(--color-white);

  --button-active-background-color: var(--color-primary-900);
  --button-active-color: var(--color-primary);
  --button-active-border-color: var(--color-primary);

  --button-hover-background-color: var(--color-primary-950);
  --button-hover-color: var(--color-primary);
  --button-hover-border-color: var(--color-primary);

  --button-focus-outline-color: hsla(var(--color-primary-h), var(--color-primary-s), var(--color-primary-600-l), 0.33);
}

.tertiary {
  font-weight: var(--font-weight-regular) !important;

  --button-background-color: var(--color-white);
  --button-color: var(--color-text-dark);
  --button-border-color: var(--color-neutral-850);

  --button-active-background-color: var(--color-primary-tint-2);
  --button-active-color: var(--color-primary);
  --button-active-border-color: var(--color-primary);

  --button-hover-background-color: var(--color-neutral-950);
  --button-hover-color: var(--color-text-dark);
  --button-hover-border-color: var(--color-neutral-800);

  --button-focus-outline-color: hsla(var(--color-neutral-h), var(--color-neutral-s), var(--color-neutral-l), 0.2);
}

.success {
	--button-background-color: var(--color-success);
	--button-color: var(--color-text-xlight);
	--button-border-color: var(--color-success);

	--button-active-background-color: var(--color-success-350);
	--button-active-border-color: var(--color-success-350);

	--button-hover-background-color: var(--color-success-450);
	--button-hover-border-color: var(--color-success-450);

	--button-focus-outline-color: hsla(var(--color-success-h), var(--color-success-s), var(--color-success-l), 0.33);
}

.warning {
	--button-background-color: var(--color-warning);
	--button-color: var(--color-text-xlight);
	--button-border-color: var(--color-warning);

	--button-active-background-color: var(--color-warning-500);
	--button-active-border-color: var(--color-warning-500);

	--button-hover-background-color: var(--color-warning-650);
	--button-hover-border-color: var(--color-warning-650);

  	--button-focus-outline-color: hsla(var(--color-warning-h), var(--color-warning-s), var(--color-warning-l), 0.33);
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

	--button-focus-outline-color: hsla(var(--color-danger-h), var(--color-danger-s), var(--color-danger-l), 0.33);
}

.outline {
	--button-background-color: var(--color-foreground-xlight);
	--button-disabled-background-color: var(--color-foreground-xlight);
	--button-active-background-color: var(--color-foreground-xlight);

  	&.primary {
		--button-color: var(--color-primary);
	  	--button-border-color: var(--color-primary);
	  	--button-active-background-color: var(--color-primary);
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
	--button-active-background-color: transparent;
  	--button-active-border-color: transparent;
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
