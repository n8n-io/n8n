import type { DropdownMenuItemProps } from '../N8nDropdownMenu/DropdownMenu.types';

export interface AiModelSelectorMenuItemData {
	badgeLabel?: string;
	/** Right-aligned action pill on the item (e.g. an n8n credits balance). */
	actionPill?: { text: string; type?: 'default' | 'danger' };
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
