import type { IconName } from '@n8n/design-system';
import type { McpRegistryServerIconResponse } from '@n8n/api-types';

function pickIconForTheme(
	icons: McpRegistryServerIconResponse[],
	appliedTheme: 'light' | 'dark',
): string | null {
	if (icons.length === 0) return null;
	const themed = icons.find((i) => i.theme === appliedTheme);
	if (themed) return themed.src;
	const untagged = icons.find((i) => i.theme === undefined);
	return (untagged ?? icons[0]).src;
}

export function iconForTool(
	icons: McpRegistryServerIconResponse[],
	appliedTheme: 'light' | 'dark',
): { type: 'file'; src: string } | { type: 'icon'; name: IconName } {
	const src = pickIconForTheme(icons, appliedTheme);
	return src ? { type: 'file', src } : { type: 'icon', name: 'mcp' };
}
