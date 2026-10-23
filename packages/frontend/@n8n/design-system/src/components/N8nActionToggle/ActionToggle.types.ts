import type { ButtonSize } from '../../types/button';
import type { IconSize } from '../../types/icon';

/**
 * Extracted from the SFC: `<script setup>` types that reference the component's
 * generic parameter cannot be exported in place — the export hoists them above
 * the generic's scope. Left unexported they are private names in the emitted
 * declaration, which publishes no prop names (TS4082).
 */
export type ActionToggleItem<T extends string = string> = {
	label: string;
	disabled?: boolean;
	divided?: boolean;
	/** Whether to render the item as a destructive action. */
	destructive?: boolean;
	type?: 'external-link';
	/** Tooltip content for a trailing info icon, such as the reason an item is disabled. */
	tooltip?: string;
} & ({ id: T; value?: T } | { id?: T; value: T });

export interface ActionToggleProps<T extends string = string> {
	actions?: Array<ActionToggleItem<T>>;
	placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';
	theme?: 'default' | 'dark';
	/** Size of the default trigger button. */
	size?: ButtonSize;
	/** Size of the ellipsis icon in the default trigger. It does not change with `size`. */
	iconSize?: IconSize;
	loading?: boolean;
	loadingRowCount?: number;
	disabled?: boolean;
	popperClass?: string;
	trigger?: 'click' | 'hover';
}
