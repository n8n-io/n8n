import type { ButtonSize, IconSize } from '../../types';

export type ColumnHeader =
	| {
			key: string;
			label: string;
			visible: boolean;
			disabled: false;
	  }
	// Disabled state ensures current sort order is not lost if user resorts teh columns
	// even if some columns are disabled / not available in the current run
	| { key: string; disabled: true };

export interface TableHeaderControlsButtonProps<ColumnType extends ColumnHeader> {
	columns: ColumnType[];
	buttonSize?: ButtonSize;
	iconSize?: IconSize;
}
