import type { ButtonProps } from '../../types/button';
import type { DropdownMenuItemProps } from '../N8nDropdownMenu/DropdownMenu.types';

export interface SetupConnectionProps {
	/** Whether the host has a saved connection to display. */
	connected: boolean;
	/** Label for the saved account or authentication value. */
	valueLabel?: string;
	/** Public account identifier, credential name, or masked key. Never pass a secret. */
	value?: string;
	/** Label for the primary connect or save action. */
	actionLabel: string;
	/** Button treatment for the connect or save action. */
	actionVariant?: ButtonProps['variant'];
	/** Secondary actions for the current connection method. */
	actions: DropdownMenuItemProps[];
	/** Whether the primary action is unavailable, such as for an incomplete form. */
	actionDisabled?: boolean;
	/** Whether a connection attempt or save is in progress. */
	loading?: boolean;
	/** Whether the connection and its secondary actions are unavailable. */
	disabled?: boolean;
}
