import type {
	AcceptableValue,
	RekaListboxItemEmits,
	RekaListboxItemProps,
	RekaListboxRootEmits,
	RekaListboxRootProps,
} from './reka-ui';

export type ListboxSizes = 'small' | 'default' | 'medium';
export type ListboxVariants = 'boxed' | 'flush';

export type ListboxProps = Omit<RekaListboxRootProps, 'as' | 'asChild'> & {
	/**
	 * Visual density of list rows.
	 * @defaultValue 'default'
	 */
	size?: ListboxSizes;
	/**
	 * Surface treatment of the list.
	 * `boxed` — bordered container. `flush` — no outer border (embed in a parent surface).
	 * @defaultValue 'boxed'
	 */
	variant?: ListboxVariants;
	/**
	 * Max height of the scrollable content area.
	 * @defaultValue '360px'
	 */
	maxHeight?: string;
};

export type ListboxEmits = RekaListboxRootEmits;

export type ListboxSlotUi = {
	root: string;
	content: string;
	isFrozen: string;
};

export type ListboxSlots = {
	default(props: { isFrozen: boolean; ui: ListboxSlotUi }): unknown;
	content(props: { isFrozen: boolean; ui: ListboxSlotUi }): unknown;
};

export type ListboxItemProps = Omit<RekaListboxItemProps, 'as' | 'asChild'> & {
	/** Primary text shown when the default slot is empty */
	label?: string;
	/** Secondary text shown under the label when the default slot is empty */
	description?: string;
	/**
	 * Controlled open state for a trailing menu. Bind with `v-model:menu-open`.
	 * Keeps listbox hover/pointer behavior stable while a menu is open.
	 */
	menuOpen?: boolean;
};

export type ListboxItemEmits = RekaListboxItemEmits & {
	'update:menuOpen': [open: boolean];
};

export type ListboxItemSlotUi = {
	row: string;
	option: string;
	trailing: string;
};

export type ListboxItemDefaultSlotUi = {
	info: string;
	leading: string;
	text: string;
	label: string;
	description: string;
};

export type ListboxItemDefaultProps = {
	label?: string;
	description?: string;
	disabled?: boolean;
};

export type ListboxItemDefaultSlots = {
	leading(props: {
		label?: string;
		description?: string;
		disabled?: boolean;
		ui: ListboxItemDefaultSlotUi;
	}): unknown;
	label(props: {
		label?: string;
		disabled?: boolean;
		ui: ListboxItemDefaultSlotUi;
	}): unknown;
	description(props: {
		description?: string;
		disabled?: boolean;
		ui: ListboxItemDefaultSlotUi;
	}): unknown;
};

export type ListboxItemSlots = {
	/** Replaces the entire option body (default is ListboxItemDefault) */
	default(props: {
		label?: string;
		description?: string;
		disabled?: boolean;
		ui: ListboxItemSlotUi;
	}): unknown;
	leading(props: {
		label?: string;
		description?: string;
		disabled?: boolean;
		ui: ListboxItemDefaultSlotUi;
	}): unknown;
	label(props: {
		label?: string;
		disabled?: boolean;
		ui: ListboxItemDefaultSlotUi;
	}): unknown;
	description(props: {
		description?: string;
		disabled?: boolean;
		ui: ListboxItemDefaultSlotUi;
	}): unknown;
	/** Row actions rendered outside the option (use for dropdown menus) */
	trailing(props: {
		menuOpen: boolean;
		setMenuOpen: (open: boolean) => void;
		ui: ListboxItemSlotUi;
	}): unknown;
};

export type { AcceptableValue };
