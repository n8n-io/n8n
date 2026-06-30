import type { DropdownMenuItemProps } from '@n8n/design-system';

export interface AiModelSelectorMenuItemData {
	badgeLabel?: string;
	description?: string;
	descriptionTooltipTeleported?: boolean;
	fullName?: string;
	parts?: string[];
}

export type AiModelSelectorMenuItem<
	TData extends AiModelSelectorMenuItemData = AiModelSelectorMenuItemData,
> = DropdownMenuItemProps<string, TData>;
