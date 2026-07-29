export type ActionToggleItem<T extends string> = {
	label: string;
	disabled?: boolean;
	type?: 'external-link';
} & ({ id: T; value?: T } | { id?: T; value: T });

export interface ActionToggleProps<T extends string> {
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
