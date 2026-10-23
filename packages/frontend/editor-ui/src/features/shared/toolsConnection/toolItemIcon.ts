import type { NodeIconSource, ToolConnectionItem, ToolIconSource } from './types';

export function resolveToolItemIcon(item: ToolConnectionItem): ToolIconSource | null {
	return item.iconSource ?? null;
}

/**
 * Variant of `resolveToolItemIcon` for consumers that render through
 * `N8nNodeIcon`, which cannot draw an avatar tile — an avatar source
 * degrades to its glyph instead.
 */
export function resolveToolItemNodeIcon(item: ToolConnectionItem): NodeIconSource | null {
	const source = item.iconSource;
	if (!source) return null;
	if (source.type === 'avatar') return { type: 'icon', name: source.personalisation.icon };
	return source;
}
