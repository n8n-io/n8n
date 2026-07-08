import type { DropdownMenuItemProps } from '@n8n/design-system';

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
