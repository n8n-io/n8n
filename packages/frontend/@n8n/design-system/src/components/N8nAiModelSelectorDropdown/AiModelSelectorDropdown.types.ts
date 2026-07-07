import type { DropdownMenuItemProps } from '../N8nDropdownMenu/DropdownMenu.types';

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
