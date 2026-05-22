import type { SimplifiedNodeType } from '@/Interface';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon';

export type ToolRowNodeType = SimplifiedNodeType | null;

export type ToolRowItem = {
	index: number;
	label: string;
	nodeType: ToolRowNodeType;
};

export type ToolRow = {
	index: number;
	label: string;
	typeLabel: string;
	nodeType: ToolRowNodeType;
	fallbackIcon: IconName;
	isGrouped: boolean;
	items: ToolRowItem[];
};

export type ToolMenuItem = DropdownMenuItemProps<number, { nodeType: ToolRowNodeType }>;
