<script lang="ts">
import { computed, defineComponent, inject, useAttrs, useCssModule } from 'vue';
import { DropdownKey } from './mixin';

const componentName = 'IDropdownItem';

export default defineComponent({
	name: componentName,
	inheritAttrs: false,
	props: {
		/**
		 * The active state of the dropdown item
		 * @type Boolean
		 * @default false
		 * @name active
		 */
		active: {
			type: Boolean,
			default: false,
		},
		/**
		 * The disabled state of the dropdown item
		 * @type Boolean
		 * @default false
		 * @name disabled
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
		/**
		 * Show a divider above the dropdown item
		 * @type Boolean
		 * @default false
		 * @name disabled
		 */
		divided: {
			type: Boolean,
			default: false,
		},
		/**
		 * Renders the component as an anchor link with a `href` attribute
		 * @type String
		 * @default undefined
		 * @name to
		 */
		href: {
			type: String,
			default: undefined,
		},
		/**
		 * Display the dropdown item as plaintext
		 * @type String
		 * @default div
		 * @name plaintext
		 */
		plaintext: {
			type: Boolean,
			default: false,
		},
		/**
		 * Set the HTML tag to be used for rendering the dropdown item
		 * @type String
		 * @default div
		 * @name tag
		 */
		tag: {
			type: String,
			default: 'div',
		},
		/**
		 * The tabindex of the list group item
		 * @type Number | String
		 * @default 0
		 * @name tabindex
		 */
		tabindex: {
			type: [Number, String],
			default: 0,
		},
		/**
		 * Renders the component as a Router Link component with a `to` attribute
		 * @type String
		 * @default undefined
		 * @name to
		 */
		to: {
			type: [String, Object],
			default: undefined,
		},
	},
	setup(props) {
		const styles = useCssModule();
		const dropdown = inject(DropdownKey, null);
		const attrs = useAttrs();

		const classes = computed(() => ({
			[styles.active]: props.active,
			[styles.disabled]: props.disabled,
			[styles.plaintext]: props.plaintext,
		}));

		const isDisabled = computed(() => props.disabled || dropdown?.disabled.value);
		const ariaDisabled = computed(() => {
			if (attrs.role === 'link') {
				return null;
			}

			return isDisabled.value ? 'true' : null;
		});

		const role = computed(() => (props.to || props.href ? null : 'menuitem'));
		const tabIndex = computed(() => (isDisabled.value ? -1 : props.tabindex));

		function onClick(event: Event) {
			dropdown?.onItemClick(event);
		}

		return {
			classes,
			isDisabled,
			ariaDisabled,
			role,
			tabIndex,
			onClick,
		};
	},
});
</script>

<template>
	<component
		v-bind="$attrs"
		v-on="$listeners"
		:is="tag"
		class="dropdown-item"
		:class="classes"
		:role="role"
		:tag="tag"
		:tabindex="tabIndex"
		:disabled="isDisabled"
		:aria-disabled="ariaDisabled"
		:aria-pressed="active"
		@click="onClick"
	>
		<!-- @slot default Slot for default dropdown item content -->
		<slot />
	</component>
</template>

<style lang="scss" module>
.dropdownItem {
	display: flex;
	margin: var(
		--dropdown--item--margin,
		(
			var(--dropdown--item--margin-top, 0)
				var(
					--dropdown--item--margin-right,
					var(--dropdown--body--padding-right, calc(var(--dropdown--padding-right) * -1))
				)
				var(--dropdown--item--margin-bottom, 0)
				var(
					--dropdown--item--margin-left,
					var(--dropdown--body--padding-left, calc(var(--dropdown--padding-left) * -1))
				)
		)
	);
	text-align: inherit; // For `<button>`s
	white-space: nowrap; // prevent links from randomly breaking onto new lines
	cursor: pointer;
	transition-property: var(
		--dropdown--item--transition-property,
		(background-color, border-color, color)
	);
	transition-timing-function: var(
		--dropdown--item--transition-timing-function,
		var(--transition-timing-function)
	);
	transition-duration: var(--dropdown--item--transition-duration, var(--transition-duration));
	color: var(--dropdown--item--color, var(--dropdown--color));
	border-style: var(
		--dropdown--item--border-style,
		var(
			--dropdown--border-style,
			(
				var(
						--dropdown--item--border-top-style,
						var(--dropdown--border-top-style, var(--border-top-style))
					)
					var(
						--dropdown--item--border-right-style,
						var(--dropdown--border-right-style, var(--border-right-style))
					)
					var(
						--dropdown--item--border-bottom-style,
						var(--dropdown--border-bottom-style, var(--border-bottom-style))
					)
					var(
						--dropdown--item--border-left-style,
						var(--dropdown--border-left-style, var(--border-left-style))
					)
			)
		)
	);
	border-width: var(
		--dropdown--item--border-width,
		(
			var(--dropdown--item--border-top-width, 0) var(--dropdown--item--border-right-width, 0)
				var(--dropdown--item--border-bottom-width, 0) var(--dropdown--item--border-left-width, 0)
		)
	);
	border-color: var(
		--dropdown--item--border-color,
		var(
			--dropdown--border-color,
			(
				var(
						--dropdown--item--border-top-color,
						var(--dropdown--border-top-color, var(--border-top-color))
					)
					var(
						--dropdown--item--border-right-color,
						var(--dropdown--border-right-color, var(--border-right-color))
					)
					var(
						--dropdown--item--border-bottom-color,
						var(--dropdown--border-bottom-color, var(--border-bottom-color))
					)
					var(
						--dropdown--item--border-left-color,
						var(--dropdown--border-left-color, var(--border-left-color))
					)
			)
		)
	);
	padding: var(
		--dropdown--item--padding,
		var(
			--dropdown--padding,
			(
				var(
						--dropdown--item--padding-top,
						calc(var(--dropdown--padding-top, var(--padding-top)) * 0.5)
					)
					var(--dropdown--item--padding-right, var(--dropdown--padding-right, var(--padding-right)))
					var(
						--dropdown--item--padding-bottom,
						calc(var(--dropdown--padding-bottom, var(--padding-bottom)) * 0.5)
					)
					var(--dropdown--item--padding-left, var(--dropdown--padding-left, var(--padding-left)))
			)
		)
	);
	background: var(--dropdown--item--background, var(--dropdown--background, transparent));

	&:not(.disabled, .plaintext) {
		&:hover,
		&:focus {
			color: var(--dropdown--item--hover--color, var(--dropdown--item--color));
			background: var(--dropdown--item--hover--background, var(--dropdown--item--background));
		}
	}

	&:hover,
	&:focus {
		outline: 0;
		text-decoration: none;
	}
}

.plaintext {
	cursor: default;
}

.disabled {
	color: var(--dropdown--item--disabled--color, var(--dropdown--item--color));
	background: var(--dropdown--item--disabled--background, var(--dropdown--item--background));
	pointer-events: none;
	cursor: default;
}

.active {
	color: var(--dropdown--item--active--color, var(--dropdown--item--color));
	background: var(--dropdown--item--active--background, var(--dropdown--item--background));
	font-weight: var(--dropdown--item--active--font-weight, var(--font-weight-semibold));
}
</style>
