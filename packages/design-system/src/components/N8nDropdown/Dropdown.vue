<script lang="ts">
import {
	toRef,
	provide,
	computed,
	ref,
	useSlots,
	onMounted,
	onBeforeUnmount,
	PropType,
	defineComponent,
	useCssModule,
} from 'vue';
import { on, off, isFocusable, isKey } from '../../utils';
import { DropdownKey } from './mixin';
import { useClickOutside, PopupEvent, usePopupControl } from '../../composables';
import { Placement } from '@floating-ui/dom';

const componentName = 'IDropdown';

export default defineComponent({
	name: componentName,
	inheritAttrs: false,
	props: {
		/**
		 * The duration of the hide and show animation
		 * @type Number
		 * @default 300
		 * @name animationDuration
		 */
		animationDuration: {
			type: Number,
			default: 300,
		},
		/**
		 * The color variant of the dropdown
		 * @type light | dark
		 * @default
		 * @name color
		 */
		color: {
			type: String,
			default: undefined,
		},
		/**
		 * The disabled state of the dropdown
		 * @type Boolean
		 * @default false
		 * @name disabled
		 */
		disabled: {
			type: Boolean,
			default: false,
		},
		/**
		 * Used to hide the dropdown when clicking or selecting a dropdown item
		 * @type Boolean
		 * @default false
		 * @name hideOnItemClick
		 */
		hideOnItemClick: {
			type: Boolean,
			default: true,
		},
		/**
		 * The keydown events bound to the trigger element
		 * @type string[]
		 * @default [up, down, enter, space, tab, esc]
		 * @name triggerKeyBindings
		 */
		triggerKeyBindings: {
			type: Array,
			default: (): string[] => ['up', 'down', 'enter', 'space', 'tab', 'esc'],
		},
		/**
		 * The keydown events bound to the dropdown item elements
		 * @type string[]
		 * @default [up, down, enter, space, tab, esc]
		 * @name itemKeyBindings
		 */
		itemKeyBindings: {
			type: Array,
			default: (): string[] => ['up', 'down', 'enter', 'space', 'tab', 'esc'],
		},
		/**
		 * Used to manually control the visibility of the dropdown
		 * @type Boolean
		 * @default false
		 * @name visible
		 */
		visible: {
			type: Boolean,
			default: false,
		},
		/**
		 * Displays an arrow on the dropdown pointing to the trigger element
		 * @type Boolean
		 * @default true
		 * @name arrow
		 */
		arrow: {
			type: Boolean,
			default: true,
		},
		/**
		 * The placement of the dropdown
		 * @type top | top-start | top-end | bottom | bottom-start | bottom-end | left | left-start | left-end | right | right-start | right-end
		 * @default false
		 * @name placement
		 */
		placement: {
			type: String as PropType<Placement>,
			default: 'bottom',
		},
		/**
		 * The events used to trigger the dropdown
		 * @type hover | focus | click | manual
		 * @default [click]
		 * @name trigger
		 */
		events: {
			type: [String, Array] as PropType<PopupEvent | PopupEvent[]>,
			default: (): string[] => ['click'],
		},
		/**
		 * The offset of the dropdown relative to the trigger element
		 * @type Number
		 * @default 6
		 * @name offset
		 */
		offset: {
			type: Number,
			default: 6,
		},
		/**
		 * Determines whether hover state should be transferred from trigger to popup
		 * @type Boolean
		 * @default true
		 * @name interactable
		 */
		interactable: {
			type: Boolean,
			default: true,
		},
		/**
		 * Used to override the floating-ui options used for creating the dropdown
		 * @type Object
		 * @default {}
		 * @name popupOptions
		 */
		popupOptions: {
			type: Object,
			default: (): any => ({}),
		},
		/**
		 * The size variant of the dropdown
		 * @type sm | md | lg
		 * @default
		 * @name size
		 */
		size: {
			type: String,
			default: undefined,
		},
		/**
		 * Delay in milliseconds before the popover is hidden on hover
		 * @name hoverHideDelay
		 * @type Number
		 * @default 300
		 */
		hoverHideDelay: {
			type: Number,
			default: 300,
		},
	},
	emits: [
		/**
		 * Event emitted when clicking outside the dropdown elements
		 * @event click:outside
		 */
		'click:outside',
		/**
		 * Event emitted for setting the visible
		 * @event update:visible
		 */
		'update:visible',
	],
	setup(props, { emit }) {
		const styles = useCssModule();
		const wrapperRef = ref<HTMLElement | null>(null);
		const triggerRef = ref<HTMLElement | null>(null);
		const popupRef = ref<HTMLElement | null>(null);
		const bodyRef = ref<HTMLElement | null>(null);
		const arrowRef = ref<HTMLElement | null>(null);

		const componentProps = computed(() => ({
			disabled: props.disabled,
			events: props.events,
			placement: props.placement,
			interactable: props.interactable,
			visible: props.visible,
			animationDuration: props.animationDuration,
			hoverHideDelay: props.hoverHideDelay,
			offset: props.offset,
		}));
		const { visible, hide, show, onKeyEscape, focusTrigger, onClick, onClickOutside } =
			usePopupControl({
				triggerRef,
				popupRef,
				arrowRef,
				componentProps,
				emit,
			});

		const slots = useSlots();
		const classes = computed(() => {
			return {
				[styles.dropdown]: true,
				[styles[props.color]]: true,
				[styles[props.size]]: true,
			};
		});

		useClickOutside({ elementRef: wrapperRef, fn: onClickOutside });

		const disabled = toRef(props, 'disabled');
		provide(DropdownKey, {
			disabled,
			onItemClick,
		});

		onMounted(() => {
			if (!triggerRef.value || !popupRef.value) {
				return;
			}

			for (const child of triggerRef.value.children) {
				on(child as HTMLElement, 'keydown', onTriggerKeyDown);
			}

			on(popupRef.value, 'keydown', onItemKeyDown);
		});

		onBeforeUnmount(() => {
			if (!triggerRef.value || !popupRef.value) {
				return;
			}

			for (const child of triggerRef.value.children) {
				off(child as HTMLElement, 'keydown', onTriggerKeyDown);
			}

			off(popupRef.value, 'keydown', onItemKeyDown);
		});

		function getFocusableItems(): HTMLElement[] {
			if (!bodyRef.value) {
				return [];
			}

			const focusableItems = [];

			for (const child of bodyRef.value.children) {
				if (isFocusable(child as HTMLElement)) {
					focusableItems.push(child as HTMLElement);
				}
			}

			return focusableItems;
		}

		function onTriggerKeyDown(event: KeyboardEvent) {
			if (props.triggerKeyBindings.length === 0) {
				return;
			}

			const focusableItems = getFocusableItems();
			const activeIndex = focusableItems.findIndex((item: any) => item.active);
			const initialIndex = activeIndex > -1 ? activeIndex : 0;
			const focusTarget = focusableItems[initialIndex];

			switch (true) {
				case isKey('up', event) && props.triggerKeyBindings.includes('up'):
				case isKey('down', event) && props.triggerKeyBindings.includes('down'):
					show();

					setTimeout(
						() => {
							focusTarget.focus();
						},
						visible.value ? 0 : props.animationDuration,
					);

					event.preventDefault();
					event.stopPropagation();
					break;

				case isKey('enter', event) && props.triggerKeyBindings.includes('enter'):
				case isKey('space', event) && props.triggerKeyBindings.includes('space'):
					onClick();

					if (!visible.value) {
						setTimeout(() => {
							focusTarget.focus();
						}, props.animationDuration);
					}

					event.preventDefault();
					break;

				case isKey('tab', event) && props.triggerKeyBindings.includes('tab'):
				case isKey('esc', event) && props.triggerKeyBindings.includes('esc'):
					hide();
					break;
			}
		}

		function onItemKeyDown(event: KeyboardEvent) {
			if (props.itemKeyBindings.length === 0) {
				return;
			}

			switch (true) {
				case isKey('up', event) && props.itemKeyBindings.includes('up'):
				case isKey('down', event) && props.itemKeyBindings.includes('down'):
					const focusableItems = getFocusableItems();

					const currentIndex = focusableItems.findIndex((item) => item === event.target);
					const maxIndex = focusableItems.length - 1;
					let nextIndex;

					if (isKey('up', event)) {
						nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
					} else {
						nextIndex = currentIndex < maxIndex ? currentIndex + 1 : maxIndex;
					}

					focusableItems[nextIndex].focus();

					event.preventDefault();
					event.stopPropagation();
					break;

				case isKey('enter', event) && props.itemKeyBindings.includes('enter'):
				case isKey('space', event) && props.itemKeyBindings.includes('space'):
					(event.target as HTMLElement).click();

					if (props.hideOnItemClick) {
						hide();
					}
					focusTrigger();

					event.preventDefault();
					break;

				case isKey('tab', event) && props.itemKeyBindings.includes('tab'):
				case isKey('esc', event) && props.itemKeyBindings.includes('esc'):
					hide();
					focusTrigger();

					event.preventDefault();
					break;
			}
		}

		function onItemClick(event: Event) {
			if (props.hideOnItemClick) {
				hide();
			}
		}

		return {
			wrapperRef,
			triggerRef,
			popupRef,
			bodyRef,
			arrowRef,
			visible,
			hide,
			show,
			onKeyEscape,
			focusTrigger,
			onClick,
			classes,
			slots,
		};
	},
});
</script>

<template>
	<div
		v-bind="$attrs"
		ref="wrapperRef"
		:class="['n8n-dropdown', $style.dropdownWrapper]"
		aria-haspopup="true"
		@keyup.esc="onKeyEscape"
	>
		<div ref="triggerRef" class="dropdown-trigger">
			<!-- @slot default Slot for dropdown trigger -->
			<slot />
		</div>

		<transition name="zoom-in-top-transition">
			<div
				v-show="visible"
				ref="popupRef"
				:class="classes"
				role="menu"
				:aria-hidden="visible ? 'false' : 'true'"
			>
				<span v-if="arrow" ref="arrowRef" class="arrow" />
				<div v-if="$slots.header" :class="$style.dropdownHeader">
					<!-- @slot header Slot for dropdown header content -->
					<slot name="header" />
				</div>
				<div v-if="$slots.body" ref="bodyRef" :class="$style.dropdownBody">
					<!-- @slot body Slot for dropdown body content -->
					<slot name="body" />
				</div>
				<div v-if="$slots.footer" :class="$style.dropdownFooter">
					<!-- @slot footer Slot for dropdown footer content -->
					<slot name="footer" />
				</div>
			</div>
		</transition>
	</div>
</template>

<style lang="scss" module>
@import '../../css/mixins/popup';

.dropdownWrapper {
	display: inline-block;
	position: relative;
}

.dropdownTrigger {
	cursor: pointer;
}

.dropdown {
	@include popup(var(--dropdown--z-index, 2000));
	@include popup-arrow();
	@include popup-arrow-size-variant(var(--dropdown--arrow--size, 6px));

	text-align: left; // Ensures proper alignment if parent has it changed (e.g., modal footer)
	list-style: none;
	line-height: var(--dropdown--line-height, var(--font-line-height-regular));
	font-size: var(--dropdown--font-size, var(--font-size-s));
	background-clip: padding-box;
	display: inline-block;
	white-space: normal;
	min-width: var(--dropdown--min-width, 240px);
	max-width: var(--dropdown--max-width, 90vw);
	color: var(--dropdown--color, var(--color-text-base));

	> *:nth-child(2) {
		border-top-left-radius: var(--dropdown--border-top-left-radius, var(--border-radius-base));
		border-top-right-radius: var(--dropdown--border-top-right-radius, var(--border-radius-base));
	}

	> *:last-of-type {
		border-bottom-left-radius: var(
			--dropdown--border-bottom-left-radius,
			var(--border-radius-base)
		);
		border-bottom-right-radius: var(
			--dropdown--border-bottom-right-radius,
			var(--border-radius-base)
		);
	}

	@include popup-arrow-color-variant-for-side(
		'top',
		var(--dropdown--background),
		var(--dropdown--border-bottom-color, var(--border-color-base))
	);

	@include popup-arrow-color-variant-for-side(
		'right',
		var(--dropdown--background),
		var(--dropdown--border-left-color, var(--border-color-base))
	);

	@include popup-arrow-color-variant-for-side(
		'bottom',
		var(--dropdown--background),
		var(--dropdown--border-top-color, var(--border-color-base))
	);

	@include popup-arrow-color-variant-for-side(
		'left',
		var(--dropdown--background),
		var(--dropdown--border-right-color, var(--border-color-base))
	);
}

.dropdownHeader {
	border-style: var(
		--dropdown--header--border-style,
		var(
				--dropdown--header--border-top-style,
				var(--dropdown--border-top-style, var(--border-top-style))
			)
			var(
				--dropdown--header--border-right-style,
				var(--dropdown--border-right-style, var(--border-right-style))
			)
			var(
				--dropdown--header--border-bottom-style,
				var(--dropdown--border-bottom-style, var(--border-bottom-style))
			)
			var(
				--dropdown--header--border-left-style,
				var(--dropdown--border-left-style, var(--border-left-style))
			)
	);
	border-width: var(
		--dropdown--header--border-width,
		var(
				--dropdown--header--border-top-width,
				var(--dropdown--border-top-width, var(--border-top-width))
			)
			var(
				--dropdown--header--border-right-width,
				var(--dropdown--border-right-width, var(--border-right-width))
			)
			var(--dropdown--header--border-bottom-width, var(--dropdown--border-bottom-width, 0))
			var(
				--dropdown--header--border-left-width,
				var(--dropdown--border-left-width, var(--border-left-width))
			)
	);
	border-color: var(
		--dropdown--header--border-color,
		var(
				--dropdown--header--border-top-color,
				var(--dropdown--border-top-color, var(--border-top-color))
			)
			var(
				--dropdown--header--border-right-color,
				var(--dropdown--border-right-color, var(--border-right-color))
			)
			var(
				--dropdown--header--border-bottom-color,
				var(--dropdown--border-bottom-color, var(--border-bottom-color))
			)
			var(
				--dropdown--header--border-left-color,
				var(--dropdown--border-left-color, var(--border-left-color))
			)
	);
	background-color: var(--dropdown--header--background, var(--dropdown--background));
	padding: var(
		--dropdown--header--padding,
		var(--dropdown--header--padding-top, var(--dropdown--padding-top, var(--padding-top)))
			var(--dropdown--header--padding-right, var(--dropdown--padding-right, var(--padding-right)))
			var(
				--dropdown--header--padding-bottom,
				var(--dropdown--padding-bottom, var(--padding-bottom))
			)
			var(--dropdown--header--padding-left, var(--dropdown--padding-left, var(--padding-left)))
	);
	transition-property: var(
		--dropdown--header--transition-property,
		var(--dropdown--transition-property, border-color)
	);
	transition-duration: var(
		--dropdown--header--transition-duration,
		var(--dropdown--transition-duration, var(--transition-duration))
	);
	transition-timing-function: var(
		--dropdown--header--transition-timing-function,
		var(--dropdown--transition-timing-function, var(--transition-timing-function))
	);
}

.dropdownBody {
	display: flex;
	flex-direction: column;
	border-style: var(
		--dropdown--body--border-style,
		var(
				--dropdown--body--border-top-style,
				var(--dropdown--border-top-style, var(--border-top-style))
			)
			var(
				--dropdown--body--border-right-style,
				var(--dropdown--border-right-style, var(--border-right-style))
			)
			var(
				--dropdown--body--border-bottom-style,
				var(--dropdown--border-bottom-style, var(--border-bottom-style))
			)
			var(
				--dropdown--body--border-left-style,
				var(--dropdown--border-left-style, var(--border-left-style))
			)
	);
	border-width: var(
		--dropdown--body--border-width,
		var(
				--dropdown--body--border-top-width,
				var(--dropdown--border-top-width, var(--border-top-width))
			)
			var(
				--dropdown--body--border-right-width,
				var(--dropdown--border-right-width, var(--border-right-width))
			)
			var(
				--dropdown--body--border-bottom-width,
				var(--dropdown--border-bottom-width, var(--border-bottom-width))
			)
			var(
				--dropdown--body--border-left-width,
				var(--dropdown--border-left-width, var(--border-left-width))
			)
	);
	border-color: var(
		--dropdown--body--border-color,
		var(
				--dropdown--body--border-top-color,
				var(--dropdown--border-top-color, var(--border-top-color))
			)
			var(
				--dropdown--body--border-right-color,
				var(--dropdown--border-right-color, var(--border-right-color))
			)
			var(
				--dropdown--body--border-bottom-color,
				var(--dropdown--border-bottom-color, var(--border-bottom-color))
			)
			var(
				--dropdown--body--border-left-color,
				var(--dropdown--border-left-color, var(--border-left-color))
			)
	);
	background-color: var(--dropdown--body--background, var(--dropdown--background));
	padding: var(
		--dropdown--body--padding,
		var(--dropdown--body--padding-top, var(--dropdown--padding-top, var(--padding-top)))
			var(--dropdown--body--padding-right, var(--dropdown--padding-right, var(--padding-right)))
			var(--dropdown--body--padding-bottom, var(--dropdown--padding-bottom, var(--padding-bottom)))
			var(--dropdown--body--padding-left, var(--dropdown--padding-left, var(--padding-left)))
	);
	transition-property: var(
		--dropdown--body--transition-property,
		var(--dropdown--transition-property, border-color)
	);
	transition-duration: var(
		--dropdown--body--transition-duration,
		var(--dropdown--transition-duration, var(--transition-duration))
	);
	transition-timing-function: var(
		--dropdown--body--transition-timing-function,
		var(--dropdown--transition-timing-function, var(--transition-timing-function))
	);

	.n8n-dropdown {
		width: 100%;
	}
}

.dropdownFooter {
	border-style: var(
		--dropdown--footer--border-style,
		var(
				--dropdown--footer--border-top-style,
				var(--dropdown--border-top-style, var(--border-top-style))
			)
			var(
				--dropdown--footer--border-right-style,
				var(--dropdown--border-right-style, var(--border-right-style))
			)
			var(
				--dropdown--footer--border-bottom-style,
				var(--dropdown--border-bottom-style, var(--border-bottom-style))
			)
			var(
				--dropdown--footer--border-left-style,
				var(--dropdown--border-left-style, var(--border-left-style))
			)
	);
	border-width: var(
		--dropdown--footer--border-width,
		var(--dropdown--footer--border-top-width, var(--dropdown--border-top-width, 0))
			var(
				--dropdown--footer--border-right-width,
				var(--dropdown--border-right-width, var(--border-right-width))
			)
			var(
				--dropdown--footer--border-bottom-width,
				var(--dropdown--border-bottom-width, var(--border-bottom-width))
			)
			var(
				--dropdown--footer--border-left-width,
				var(--dropdown--border-left-width, var(--border-left-width))
			)
	);
	border-color: var(
		--dropdown--footer--border-color,
		var(
				--dropdown--footer--border-top-color,
				var(--dropdown--border-top-color, var(--border-top-color))
			)
			var(
				--dropdown--footer--border-right-color,
				var(--dropdown--border-right-color, var(--border-right-color))
			)
			var(
				--dropdown--footer--border-bottom-color,
				var(--dropdown--border-bottom-color, var(--border-bottom-color))
			)
			var(
				--dropdown--footer--border-left-color,
				var(--dropdown--border-left-color, var(--border-left-color))
			)
	);
	background-color: var(--dropdown--footer--background, var(--dropdown--background));
	padding: var(
		--dropdown--footer--padding,
		var(--dropdown--footer--padding-top, var(--dropdown--padding-top, var(--padding-top)))
			var(--dropdown--footer--padding-right, var(--dropdown--padding-right, var(--padding-right)))
			var(
				--dropdown--footer--padding-bottom,
				var(--dropdown--padding-bottom, var(--padding-bottom))
			)
			var(--dropdown--footer--padding-left, var(--dropdown--padding-left, var(--padding-left)))
	);
	transition-property: var(
		--dropdown--footer--transition-property,
		(var(--dropdown--transition-property, (border-color)))
	);
	transition-duration: var(
		--dropdown--footer--transition-duration,
		var(--dropdown--transition-duration, var(--transition-duration))
	);
	transition-timing-function: var(
		--dropdown--footer--transition-timing-function,
		var(--dropdown--transition-timing-function, var(--transition-timing-function))
	);
}

.light {
	--dropdown--background: var(--dropdown--light--background, var(--color-white));
	--dropdown--color: var(--dropdown--light--color, var(--contrast-text--color-light));
	--dropdown--border-top-color: var(
		--dropdown--light--border-top-color,
		var(--color-light-shade-50)
	);
	--dropdown--border-right-color: var(
		--dropdown--light--border-right-color,
		var(--color-light-shade-50)
	);
	--dropdown--border-bottom-color: var(
		--dropdown--light--border-bottom-color,
		var(--color-light-shade-50)
	);
	--dropdown--border-left-color: var(
		--dropdown--light--border-left-color,
		var(--color-light-shade-50)
	);

	--dropdown--item--hover--background: var(
		--dropdown--light--item--hover--background,
		var(--color-gray-50)
	);
	--dropdown--item--hover--color: var(
		--dropdown--light--item--hover--color,
		var(--dropdown--color)
	);

	--dropdown--item--active--background: var(
		--dropdown--light--item--active--background,
		var(--color-gray-50)
	);
	--dropdown--item--active--color: var(
		--dropdown--light--item--active--color,
		var(--dropdown--color)
	);

	--dropdown--item--disabled--background: var(
		--dropdown--light--item--disabled--background,
		transparent
	);
	--dropdown--item--disabled--color: var(
		--dropdown--light--item--disabled--color,
		var(--text--color-muted)
	);

	--dropdown--header--background: var(--dropdown--light--header--background, var(--color-gray-50));
	--dropdown--footer--background: var(--dropdown--light--footer--background, var(--color-gray-50));
}

.dark {
	--dropdown--background: var(--dropdown--dark--background, var(--color-dark));
	--dropdown--color: var(--dropdown--dark--color, var(--contrast-text--color-dark));
	--dropdown--border-top-color: var(--dropdown--dark--border-top-color, var(--color-dark-tint-50));
	--dropdown--border-right-color: var(
		--dropdown--dark--border-right-color,
		var(--color-dark-tint-50)
	);
	--dropdown--border-bottom-color: var(
		--dropdown--dark--border-bottom-color,
		var(--color-dark-tint-50)
	);
	--dropdown--border-left-color: var(
		--dropdown--dark--border-left-color,
		var(--color-dark-tint-50)
	);

	--dropdown--item--hover--background: var(
		--dropdown--dark--item--hover--background,
		var(--color-dark-tint-50)
	);
	--dropdown--item--hover--color: var(--dropdown--dark--item--hover--color, var(--dropdown--color));

	--dropdown--item--active--background: var(
		--dropdown--dark--item--active--background,
		var(--color-dark-tint-50)
	);
	--dropdown--item--active--color: var(
		--dropdown--dark--item--active--color,
		var(--dropdown--color)
	);

	--dropdown--item--disabled--background: var(
		--dropdown--dark--item--disabled--background,
		transparent
	);
	--dropdown--item--disabled--color: var(
		--dropdown--dark--item--disabled--color,
		var(--text--color-muted)
	);

	--dropdown--header--background: var(
		--dropdown--dark--header--background,
		var(--color-dark-tint-50)
	);
	--dropdown--footer--background: var(
		--dropdown--dark--footer--background,
		var(--color-dark-tint-50)
	);
}

/**
 * Size variants
 */

.sm {
	--dropdown--border-top-left-radius: var(
		--dropdown--sm--border-top-left-radius,
		calc(var(--border-top-left-radius) * var(--size-multiplier-sm))
	);
	--dropdown--border-top-right-radius: var(
		--dropdown--sm--border-top-right-radius,
		calc(var(--border-top-right-radius) * var(--size-multiplier-sm))
	);
	--dropdown--border-bottom-right-radius: var(
		--dropdown--sm--border-bottom-right-radius,
		calc(var(--border-bottom-right-radius) * var(--size-multiplier-sm))
	);
	--dropdown--border-bottom-left-radius: var(
		--dropdown--sm--border-bottom-left-radius,
		calc(var(--border-bottom-left-radius) * var(--size-multiplier-sm))
	);
	--dropdown--font-size: var(
		--dropdown--sm--font-size,
		calc(var(--font-size) * var(--size-multiplier-sm))
	);
	--dropdown--padding-top: var(
		--dropdown--sm--padding-top,
		calc(var(--padding-top) * var(--size-multiplier-sm))
	);
	--dropdown--padding-right: var(
		--dropdown--sm--padding-right,
		calc(var(--padding-right) * var(--size-multiplier-sm))
	);
	--dropdown--padding-bottom: var(
		--dropdown--sm--padding-bottom,
		calc(var(--padding-bottom) * var(--size-multiplier-sm))
	);
	--dropdown--padding-left: var(
		--dropdown--sm--padding-left,
		calc(var(--padding-left) * var(--size-multiplier-sm))
	);
}

.md {
	--dropdown--border-top-left-radius: var(
		--dropdown--md--border-top-left-radius,
		calc(var(--border-top-left-radius) * var(--size-multiplier-md))
	);
	--dropdown--border-top-right-radius: var(
		--dropdown--md--border-top-right-radius,
		calc(var(--border-top-right-radius) * var(--size-multiplier-md))
	);
	--dropdown--border-bottom-right-radius: var(
		--dropdown--md--border-bottom-right-radius,
		calc(var(--border-bottom-right-radius) * var(--size-multiplier-md))
	);
	--dropdown--border-bottom-left-radius: var(
		--dropdown--md--border-bottom-left-radius,
		calc(var(--border-bottom-left-radius) * var(--size-multiplier-md))
	);
	--dropdown--font-size: var(
		--dropdown--md--font-size,
		calc(var(--font-size) * var(--size-multiplier-md))
	);
	--dropdown--padding-top: var(
		--dropdown--md--padding-top,
		calc(var(--padding-top) * var(--size-multiplier-md))
	);
	--dropdown--padding-right: var(
		--dropdown--md--padding-right,
		calc(var(--padding-right) * var(--size-multiplier-md))
	);
	--dropdown--padding-bottom: var(
		--dropdown--md--padding-bottom,
		calc(var(--padding-bottom) * var(--size-multiplier-md))
	);
	--dropdown--padding-left: var(
		--dropdown--md--padding-left,
		calc(var(--padding-left) * var(--size-multiplier-md))
	);
}

.lg {
	--dropdown--border-top-left-radius: var(
		--dropdown--lg--border-top-left-radius,
		calc(var(--border-top-left-radius) * var(--size-multiplier-lg))
	);
	--dropdown--border-top-right-radius: var(
		--dropdown--lg--border-top-right-radius,
		calc(var(--border-top-right-radius) * var(--size-multiplier-lg))
	);
	--dropdown--border-bottom-right-radius: var(
		--dropdown--lg--border-bottom-right-radius,
		calc(var(--border-bottom-right-radius) * var(--size-multiplier-lg))
	);
	--dropdown--border-bottom-left-radius: var(
		--dropdown--lg--border-bottom-left-radius,
		calc(var(--border-bottom-left-radius) * var(--size-multiplier-lg))
	);
	--dropdown--font-size: var(
		--dropdown--lg--font-size,
		calc(var(--font-size) * var(--size-multiplier-lg))
	);
	--dropdown--padding-top: var(
		--dropdown--lg--padding-top,
		calc(var(--padding-top) * var(--size-multiplier-lg))
	);
	--dropdown--padding-right: var(
		--dropdown--lg--padding-right,
		calc(var(--padding-right) * var(--size-multiplier-lg))
	);
	--dropdown--padding-bottom: var(
		--dropdown--lg--padding-bottom,
		calc(var(--padding-bottom) * var(--size-multiplier-lg))
	);
	--dropdown--padding-left: var(
		--dropdown--lg--padding-left,
		calc(var(--padding-left) * var(--size-multiplier-lg))
	);
}
</style>
