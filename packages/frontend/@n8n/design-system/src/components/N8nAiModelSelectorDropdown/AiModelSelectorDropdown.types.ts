import type { DropdownMenuItemProps } from '../N8nDropdownMenu/DropdownMenu.types';

export interface AiModelSelectorMenuItemData {
	badgeLabel?: string;
	description?: string;
	descriptionTooltipTeleported?: boolean;
	fullName?: string;
	parts?: string[];
	/** Credential type shown as a leading `CredentialIcon` on the item and, when selected, the trigger. */
	credentialType?: string;
	/** Icon name shown instead of the credential icon (e.g. for "Configure credentials" actions). */
	leadingIcon?: string;
}

export type AiModelSelectorMenuItem<
	TData extends AiModelSelectorMenuItemData = AiModelSelectorMenuItemData,
> = DropdownMenuItemProps<string, TData>;
