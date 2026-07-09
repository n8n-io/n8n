import type { IconName } from '../N8nIcon/icons';

export interface AiTraceChipItem {
	id: string;
	icon: IconName;
	label: string;
	/** Still receiving data — shows a pulsing dot and keeps the label visible. */
	loading?: boolean;
	/** Error summary — tints the chip as danger and is appended to the tooltip. */
	error?: string;
}
