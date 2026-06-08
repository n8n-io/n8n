import type { ToolConnectionItem, ToolIconSource } from './types';

export function resolveToolItemIcon(item: ToolConnectionItem): ToolIconSource | null {
	return item.iconSource ?? null;
}
