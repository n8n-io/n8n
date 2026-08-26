/**
 * Extracted from the SFC: `<script setup>` types that reference the component's
 * generic parameter cannot be exported in place — the export hoists them above
 * the generic's scope. Left unexported they are private names in the emitted
 * declaration, which publishes no prop names (TS4082).
 */
export type ActionToggleItem<T extends string = string> = {
	label: string;
	disabled?: boolean;
	type?: 'external-link';
	/** When set, the item's label is wrapped in a tooltip (useful to explain a disabled item). */
	tooltip?: string;
} & ({ id: T; value?: T } | { id?: T; value: T });

export interface ActionToggleProps<T extends string = string> {
	actions?: Array<ActionToggleItem<T>>;
	placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';
	theme?: 'default' | 'dark';
	iconOrientation?: 'horizontal' | 'vertical';
	loading?: boolean;
	loadingRowCount?: number;
	disabled?: boolean;
	popperClass?: string;
	trigger?: 'click' | 'hover';
}
