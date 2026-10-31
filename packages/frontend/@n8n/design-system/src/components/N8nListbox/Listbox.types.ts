export type ListboxValue = string;

export type ListboxOrientation = 'vertical' | 'horizontal';

/** How a second activation treats the current value. */
export type ListboxSelectionBehavior = 'replace' | 'toggle';

export type ListboxProps = {
	/**
	 * The selected value. Bind it with `v-model`.
	 * The parent value stays in place until the parent accepts the update.
	 */
	modelValue?: ListboxValue;
	/**
	 * The selected value on first render when `modelValue` is omitted.
	 * The list keeps later changes.
	 */
	defaultValue?: ListboxValue;
	/** Accessible name for the list. */
	label?: string;
	/**
	 * The user cannot move the highlight or change the value.
	 * @default false
	 */
	disabled?: boolean;
	/**
	 * `replace` keeps one value. A second activation does not clear it.
	 * `toggle` clears the value when the user activates the selected item.
	 * @default 'replace'
	 */
	selectionBehavior?: ListboxSelectionBehavior;
	/**
	 * Up and Down, or Left and Right, move the highlight.
	 * Items sit in a row when this is `horizontal`.
	 * @default 'vertical'
	 */
	orientation?: ListboxOrientation;
	/** Reading direction. Omit it to inherit the page direction. */
	dir?: 'ltr' | 'rtl';
	/**
	 * Pointer movement moves the highlight.
	 * The highlight fill follows `data-highlighted`.
	 * @default true
	 */
	highlightOnHover?: boolean;
};

export type ListboxSlots = {
	/** Items to show in the list. */
	default(): unknown;
};
