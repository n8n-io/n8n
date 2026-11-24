import type { ButtonSize, IconSize } from '../../types';

export type ColumnHeader =
	| {
			key: string;
			label: string;
			visible: boolean;
			disabled: false;
	  }
	// Disabled state ensures current sort order is not lost if user resorts the columns
	// even if some columns are disabled / not available in the current run
	| { key: string; disabled: true };

/** Extracted from the SFC so the generic props are nameable in the emitted declaration (TS4082). */
export interface TableHeaderControlsButtonProps<ColumnType extends ColumnHeader = ColumnHeader> {
	columns: ColumnType[];
	buttonSize?: ButtonSize;
	iconSize?: IconSize;
}
