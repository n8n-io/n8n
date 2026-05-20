import type { DropdownMenuItemProps } from '@n8n/design-system';

export interface AiModelSelectorMenuItemData {
	description?: string;
	fullName?: string;
	parts?: string[];
}

export type AiModelSelectorMenuItem<
	TData extends AiModelSelectorMenuItemData = AiModelSelectorMenuItemData,
> = DropdownMenuItemProps<string, TData>;
