import type { DropdownMenuItemProps } from '../N8nDropdownMenu/DropdownMenu.types';

export interface AiModelSelectorMenuItemData {
	description?: string;
	fullName?: string;
	parts?: string[];
}

export type AiModelSelectorMenuItem<
	TData extends AiModelSelectorMenuItemData = AiModelSelectorMenuItemData,
> = DropdownMenuItemProps<string, TData>;
